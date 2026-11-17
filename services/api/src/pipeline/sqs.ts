/** The parts of an SQS event this pipeline reads. */
export interface SqsRecord {
  messageId: string
  body: string
  attributes: { ApproximateReceiveCount: string }
}
export interface SqsEvent {
  Records: SqsRecord[]
}
export interface SqsBatchResponse {
  batchItemFailures: { itemIdentifier: string }[]
}

/** maxReceiveCount of both queues (infra): the third receive is the last one before the dead-letter queue. */
export const MAX_RECEIVES = 3

export const isLastAttempt = (record: SqsRecord): boolean => Number(record.attributes.ApproximateReceiveCount) >= MAX_RECEIVES

/**
 * A document that can't be processed (corrupt, unreadable) is a permanent failure: the message is consumed.
 * Anything else is transient and is rethrown so SQS retries it.
 */
export class PermanentError extends Error {}

/** Runs `work` for each record. Transient failures go back to SQS (batchItemFailures) for the retry and the DLQ. */
export const runBatch = async (
  event: SqsEvent,
  work: (record: SqsRecord) => Promise<void>,
  onTransientFailure: (record: SqsRecord, error: unknown) => Promise<void>,
): Promise<SqsBatchResponse> => {
  const failures: SqsBatchResponse['batchItemFailures'] = []
  for (const record of event.Records) {
    try {
      await work(record)
    } catch (error) {
      if (error instanceof PermanentError) {
        // A message that can never be processed (not JSON): consume it, the queue moves on.
        console.warn(JSON.stringify({ event: 'record_dropped', messageId: record.messageId, reason: error.message }))
        continue
      }
      console.error(JSON.stringify({ event: 'record_failed', messageId: record.messageId, error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' }))
      failures.push({ itemIdentifier: record.messageId })
      try {
        if (isLastAttempt(record)) await onTransientFailure(record, error)
      } catch {
        // the record already goes to the dead-letter queue; the status update is best effort
      }
    }
  }
  return { batchItemFailures: failures }
}
