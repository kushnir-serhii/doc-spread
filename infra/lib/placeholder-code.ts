/** Inline placeholder for the pipeline workers: the real handlers arrive with slice 6 (the api is real since slice 5). */
export const WORKER_PLACEHOLDER = `
exports.handler = async (event) => {
  console.log('worker placeholder', (event.Records || []).length, 'record(s)')
}
`
