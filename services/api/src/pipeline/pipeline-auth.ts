import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

/**
 * Checks the `x-pipeline-secret` header (sent by pg_net) against `PIPELINE_SECRET`. Returns the response to send
 * when the call is not allowed, or undefined when it is. Nothing is read from a queue before this passes.
 * Both sides are hashed first, so the buffers always have equal length and the compare is constant-time.
 */
export const checkPipelineSecret = (request: Request, source: Record<string, string | undefined> = process.env): Response | undefined => {
  const expected = source.PIPELINE_SECRET
  if (!expected) {
    console.error(JSON.stringify({ event: 'pipeline_misconfigured', error: 'Missing env variable PIPELINE_SECRET' }))
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }
  const given = request.headers.get('x-pipeline-secret') ?? ''
  if (!timingSafeEqual(digest(given), digest(expected))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return undefined
}
