import type { CreateExportJobInput, ExportColumnMapping, ExportDownload, ExportJob } from '@/lib/mock/types'
import { apiFetch } from './api-fetch'
import { getSupabase } from './client'
import { notAvailableYet } from './not-available'

export { getExportMapping } from './document-types'

interface JobRow {
  id: string
  created_at: string
  format: ExportJob['format']
  type_id: string
  document_ids: string[] | null
  destination: ExportJob['destination']
  recipient: string | null
  columns: unknown
  status: ExportJob['status']
}

const JOB_COLUMNS = 'id, created_at, format, type_id, document_ids, destination, recipient, columns, status'

const toExportJob = (row: JobRow): ExportJob => ({
  id: row.id,
  createdAt: row.created_at,
  format: row.format,
  typeId: row.type_id,
  documentIds: row.document_ids ?? [],
  destination: row.destination,
  recipient: row.recipient ?? undefined,
  columns: row.columns as ExportColumnMapping, // jsonb written by the API in this shape
  status: row.status,
})

/** The company's export jobs, newest first (row-level security limits them to the caller's company). */
export const listExportJobs = async (): Promise<ExportJob[]> => {
  const { data, error } = await getSupabase().from('export_jobs').select(JOB_COLUMNS).order('created_at', { ascending: false })
  if (error) throw new Error(`Couldn't load the export history: ${error.message}`)
  return (data as JobRow[]).map(toExportJob) // columns selected above
}

const isCreated = (body: unknown): body is { jobId: string; url: string; fileName: string } =>
  typeof body === 'object' &&
  body !== null &&
  'jobId' in body &&
  typeof body.jobId === 'string' &&
  'url' in body &&
  typeof body.url === 'string' &&
  'fileName' in body &&
  typeof body.fileName === 'string'

/**
 * The server builds the file, marks the documents exported and records the job; the answer carries a signed
 * link (valid 10 minutes). Email and PDF bundles have no backend yet.
 */
export const createExportJob = async (input: CreateExportJobInput): Promise<{ job: ExportJob; download: ExportDownload }> => {
  if (input.destination === 'email') throw notAvailableYet('Sending by email')
  if (input.format === 'pdf_bundle') throw notAvailableYet('PDF bundles')
  const body = await apiFetch('/exports', {
    method: 'POST',
    body: { typeId: input.typeId, documentIds: input.documentIds, format: input.format, destination: input.destination, columns: input.columns },
  })
  if (!isCreated(body)) throw new Error('The export answer was not understood')
  const job: ExportJob = {
    id: body.jobId,
    createdAt: new Date().toISOString(),
    format: input.format,
    typeId: input.typeId,
    documentIds: input.documentIds,
    destination: 'download',
    columns: input.columns,
    status: 'completed',
  }
  return { job, download: { name: body.fileName, url: body.url } }
}
