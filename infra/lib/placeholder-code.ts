/** Inline placeholders: the real handlers arrive with slices 5 and 6. */
export const API_PLACEHOLDER = `
exports.handler = async (event) => {
  console.log('api placeholder', event.requestContext && event.requestContext.http && event.requestContext.http.path)
  return { statusCode: 501, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'not implemented' }) }
}
`

export const WORKER_PLACEHOLDER = `
exports.handler = async (event) => {
  console.log('worker placeholder', (event.Records || []).length, 'record(s)')
}
`
