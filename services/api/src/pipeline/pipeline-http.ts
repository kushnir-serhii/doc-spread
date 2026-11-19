import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './db.js'
import { checkPipelineSecret } from './pipeline-auth.js'
import { loadPipelineEnv, type PipelineEnv } from './pipeline-env.js'
import { drainQueue, type QueueMessage, type QueueName, type WorkResult } from './queue.js'

export interface PipelineContext {
  env: PipelineEnv
  supabase: SupabaseClient
}

let context: PipelineContext | undefined

/** Loaded on the first request (no top-level await): a missing variable becomes a logged 500 that names it. */
const getContext = (): PipelineContext => {
  if (!context) {
    const env = loadPipelineEnv()
    context = { env, supabase: createAdminClient(env.supabaseUrl, env.supabaseSecretKey) }
  }
  return context
}

export interface QueueWorker {
  work: (ctx: PipelineContext, message: QueueMessage) => Promise<WorkResult>
  /** The message was read the last time and keeps failing: show it on the document. */
  onGiveUp: (ctx: PipelineContext, message: QueueMessage) => Promise<void>
}

/** The whole request of a pipeline function: secret check first, then the queue is drained inside the request. */
export const servePipeline = async (request: Request, queue: QueueName, worker: QueueWorker): Promise<Response> => {
  const denied = checkPipelineSecret(request)
  if (denied) return denied
  let ctx: PipelineContext
  try {
    ctx = getContext()
  } catch (error) {
    console.error(JSON.stringify({ event: 'pipeline_misconfigured', error: error instanceof Error ? error.message : 'unknown' }))
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }
  try {
    const result = await drainQueue(
      ctx.supabase,
      queue,
      (message) => worker.work(ctx, message),
      (message) => worker.onGiveUp(ctx, message),
    )
    console.log(JSON.stringify({ event: 'drain_done', queue, ...result }))
    return Response.json(result)
  } catch (error) {
    console.error(JSON.stringify({ event: 'drain_failed', queue, error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' }))
    return Response.json({ error: 'internal_error' }, { status: 500 })
  }
}
