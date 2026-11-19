import type { SupabaseClient } from '@supabase/supabase-js'

/** Reads before a message is given up: the third read is the last one (archive + document `error`). */
export const MAX_READS = 3
/** Longer than the function's 300 s `maxDuration`: a message in flight never becomes visible again mid-run. */
export const VISIBILITY_TIMEOUT_S = 330
/** No new message is started after this: a second long document would run past `maxDuration`. */
export const DRAIN_BUDGET_MS = 150_000

export type QueueName = 'ocr' | 'extract'

/**
 * A document that can't be processed (corrupt, unreadable) is a permanent failure: the message is consumed.
 * Anything else is transient and is retried after the visibility timeout.
 */
export class PermanentError extends Error {}

export interface QueueMessage {
  msgId: number
  /** How many times the message has been read, this read included. */
  readCt: number
  message: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Reads one message (public.queue_read, service_role only). Null when the queue has no visible message. */
export const readOne = async (supabase: SupabaseClient, queue: QueueName): Promise<QueueMessage | null> => {
  const { data, error } = await supabase.rpc('queue_read', { queue_name: queue, visibility_timeout: VISIBILITY_TIMEOUT_S, quantity: 1 })
  if (error) throw new Error(`queue_read ${queue} failed: ${error.message}`)
  const row: unknown = Array.isArray(data) ? data[0] : undefined
  if (!isObject(row)) return null
  return { msgId: Number(row.msg_id), readCt: Number(row.read_ct), message: row.message }
}

export const sendMessage = async (supabase: SupabaseClient, queue: QueueName, message: Record<string, unknown>): Promise<void> => {
  const { error } = await supabase.rpc('queue_send', { queue_name: queue, message })
  if (error) throw new Error(`queue_send ${queue} failed: ${error.message}`)
}

export const deleteMessage = async (supabase: SupabaseClient, queue: QueueName, msgId: number): Promise<void> => {
  const { error } = await supabase.rpc('queue_delete', { queue_name: queue, message_id: msgId })
  if (error) throw new Error(`queue_delete ${queue} failed: ${error.message}`)
}

export const archiveMessage = async (supabase: SupabaseClient, queue: QueueName, msgId: number): Promise<void> => {
  const { error } = await supabase.rpc('queue_archive', { queue_name: queue, message_id: msgId })
  if (error) throw new Error(`queue_archive ${queue} failed: ${error.message}`)
}

/** The document a message is about. A message without one can never be processed. */
export const documentIdOf = (message: unknown): string => {
  if (!isObject(message) || typeof message.documentId !== 'string' || message.documentId === '') {
    throw new PermanentError('message has no document')
  }
  return message.documentId
}

/** `done`: consume the message. `orphan`: its document doesn't exist, archive it. */
export type WorkResult = 'done' | 'orphan'

export interface DrainResult {
  processed: number
  failed: number
}

/**
 * Drains a queue inside one request: one message at a time, until it is empty or the time budget is spent.
 * Success deletes the message. A transient failure leaves it (visible again after the timeout, so the next
 * cron tick retries); on the last read it is archived and `onGiveUp` marks the document.
 */
export const drainQueue = async (
  supabase: SupabaseClient,
  queue: QueueName,
  work: (message: QueueMessage) => Promise<WorkResult>,
  onGiveUp: (message: QueueMessage) => Promise<void>,
  budgetMs: number = DRAIN_BUDGET_MS,
): Promise<DrainResult> => {
  const started = Date.now()
  const result: DrainResult = { processed: 0, failed: 0 }
  while (Date.now() - started < budgetMs) {
    const next = await readOne(supabase, queue)
    if (!next) break
    try {
      const outcome = await work(next)
      if (outcome === 'orphan') {
        console.warn(JSON.stringify({ event: 'message_archived', queue, msgId: next.msgId, reason: 'no such document' }))
        await archiveMessage(supabase, queue, next.msgId)
      } else {
        await deleteMessage(supabase, queue, next.msgId)
      }
      result.processed += 1
    } catch (error) {
      result.failed += 1
      const permanent = error instanceof PermanentError
      console.error(
        JSON.stringify({ event: 'message_failed', queue, msgId: next.msgId, readCt: next.readCt, permanent, error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' }),
      )
      if (permanent || next.readCt >= MAX_READS) {
        try {
          if (!permanent) await onGiveUp(next)
          await archiveMessage(supabase, queue, next.msgId)
        } catch {
          // best effort: the message stays and is read again; its next failure archives it
        }
      }
    }
  }
  return result
}
