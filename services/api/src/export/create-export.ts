import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildCsv, buildXlsx, buildZip } from './files.js'
import { parseMapping, restoreMapping } from './mapping.js'
import { buildSheets } from './plan.js'
import type { ExportColumnMapping, ExportDocument, ExportFormat, FieldDef, FieldValue } from './types.js'

/** An error the caller should see: the router answers with its status, code and message. */
export class ExportError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface ExportRequest {
  typeId: string
  /** undefined: every approved document of the type */
  documentIds: string[] | undefined
  format: ExportFormat
  /** the mapping chosen in the UI; undefined: the type's saved mapping, or its fields in order */
  columns: ExportColumnMapping | undefined
}

export type ExportValidation = { ok: true; value: ExportRequest } | { ok: false; status: number; code: string; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_DOCUMENTS = 1000
const fail = (code: string, message: string, status = 400): ExportValidation => ({ ok: false, status, code, message })

export const validateExport = (body: unknown): ExportValidation => {
  if (typeof body !== 'object' || body === null) return fail('invalid_body', 'Send a JSON object')
  const { typeId, documentIds, format, destination, columns } = body as Record<string, unknown> // narrowed field by field below
  if (typeof typeId !== 'string' || !UUID.test(typeId)) return fail('invalid_type_id', 'typeId must be a document type id')
  if (format === 'pdf_bundle') return fail('not_available_yet', 'PDF bundles are not available yet')
  if (format !== 'xlsx' && format !== 'csv') return fail('invalid_format', 'format must be xlsx or csv')
  if (destination === 'email') return fail('not_available_yet', 'Sending by email is not available yet')
  if (destination !== undefined && destination !== 'download') return fail('invalid_destination', 'destination must be download')
  let ids: string[] | undefined
  if (documentIds !== undefined) {
    if (!Array.isArray(documentIds) || documentIds.length === 0 || documentIds.length > MAX_DOCUMENTS) {
      return fail('invalid_document_ids', `documentIds must hold 1 to ${MAX_DOCUMENTS} document ids`)
    }
    if (!documentIds.every((id): id is string => typeof id === 'string' && UUID.test(id))) {
      return fail('invalid_document_ids', 'documentIds must be document ids')
    }
    ids = [...new Set(documentIds)]
  }
  let mapping: ExportColumnMapping | undefined
  if (columns !== undefined) {
    mapping = parseMapping(columns)
    if (!mapping) return fail('invalid_columns', 'columns is not a valid export mapping')
  }
  return { ok: true, value: { typeId, documentIds: ids, format, columns: mapping } }
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** `<type-slug>-<yyyy-mm-dd>.<ext>` */
const fileNameFor = (typeName: string, ext: string, date: Date): string =>
  `${slugify(typeName) || 'export'}-${date.toISOString().slice(0, 10)}.${ext}`

/** A file name that is safe inside a zip. */
const entryName = (name: string): string => `${name.replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').trim().slice(0, 100) || 'table'}.csv`

interface DocumentRow {
  id: string
  file_name: string
  status: string
  type_id: string | null
  values: unknown
  uploaded_at: string
}

const toDocument = (row: DocumentRow): ExportDocument => ({
  id: row.id,
  fileName: row.file_name,
  values: typeof row.values === 'object' && row.values !== null ? (row.values as Record<string, FieldValue | undefined>) : {}, // jsonb in the app's FieldValue shape
})

export interface ExportContext {
  supabase: SupabaseClient
  bucket: string
  userId: string
  companyId: string
}

export interface ExportResult {
  jobId: string
  url: string
  fileName: string
}

const SIGNED_URL_SECONDS = 600

/** The documents to export, checked: the company's, of the type, approved. */
const loadDocuments = async ({ supabase, companyId }: ExportContext, request: ExportRequest): Promise<DocumentRow[]> => {
  const columns = 'id, file_name, status, type_id, values, uploaded_at'
  if (request.documentIds) {
    const { data, error } = await supabase.from('documents').select(columns).eq('company_id', companyId).in('id', request.documentIds)
    if (error) throw new Error(`document lookup failed: ${error.message}`)
    const byId = new Map((data as DocumentRow[]).map((row) => [row.id, row])) // columns selected above
    const ordered: DocumentRow[] = []
    for (const id of request.documentIds) {
      const row = byId.get(id)
      // Same answer for "no such document" and "someone else's document", so ids of other companies don't leak.
      if (!row) throw new ExportError(404, 'document_not_found', 'Document not found')
      if (row.type_id !== request.typeId) throw new ExportError(409, 'document_wrong_type', 'A document is not of this type')
      if (row.status !== 'approved') throw new ExportError(409, 'document_not_approved', 'Only approved documents can be exported')
      ordered.push(row)
    }
    return ordered
  }
  const { data, error } = await supabase
    .from('documents')
    .select(columns)
    .eq('company_id', companyId)
    .eq('type_id', request.typeId)
    .eq('status', 'approved')
    .order('uploaded_at', { ascending: true })
    .limit(MAX_DOCUMENTS + 1)
  if (error) throw new Error(`document lookup failed: ${error.message}`)
  if (data.length === 0) throw new ExportError(409, 'nothing_to_export', 'This type has no approved documents')
  if (data.length > MAX_DOCUMENTS) throw new ExportError(400, 'too_many_documents', `Export at most ${MAX_DOCUMENTS} documents at a time`)
  return data as DocumentRow[] // columns selected above
}

/**
 * Builds the spreadsheet of approved documents of one type, stores it, records the job, marks the documents
 * `exported` and returns a signed download link. What was written is removed again if a later step fails.
 * Never logs values or tokens.
 */
export const createExport = async (ctx: ExportContext, request: ExportRequest): Promise<ExportResult> => {
  const { supabase, bucket, userId, companyId } = ctx

  const { data: type, error: typeError } = await supabase
    .from('document_types')
    .select('id, name, current_version, export_mapping')
    .eq('id', request.typeId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (typeError) throw new Error(`type lookup failed: ${typeError.message}`)
  if (!type) throw new ExportError(404, 'not_found', 'Document type not found')
  const { data: version, error: versionError } = await supabase
    .from('document_type_versions')
    .select('fields')
    .eq('type_id', request.typeId)
    .eq('version', type.current_version)
    .maybeSingle()
  if (versionError) throw new Error(`type version lookup failed: ${versionError.message}`)
  const fields = Array.isArray(version?.fields) ? (version.fields as FieldDef[]) : [] // jsonb written by the app as FieldDef[]

  const rows = await loadDocuments(ctx, request)
  const documents = rows.map(toDocument)

  const saved = parseMapping(type.export_mapping) ?? null
  const mapping = restoreMapping(fields, request.columns ?? saved)
  const sheets = buildSheets(String(type.name), fields, mapping, request.format, documents)

  const now = new Date()
  let file: Buffer
  let ext: string
  let contentType: string
  if (request.format === 'xlsx') {
    file = await buildXlsx(sheets)
    ext = 'xlsx'
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  } else if (sheets.length === 1 && sheets[0]) {
    file = buildCsv(sheets[0])
    ext = 'csv'
    contentType = 'text/csv; charset=utf-8'
  } else {
    // CSV with tables in their own files: one csv per sheet in a zip (spec 018)
    const used = new Set<string>()
    file = buildZip(
      sheets.map((sheet, index) => {
        let name = index === 0 ? entryName(String(type.name)) : entryName(sheet.name)
        for (let n = 2; used.has(name.toLowerCase()); n += 1) name = name.replace(/(?: \d+)?\.csv$/, ` ${n}.csv`)
        used.add(name.toLowerCase())
        return { name, data: buildCsv(sheet) }
      }),
    )
    ext = 'zip'
    contentType = 'application/zip'
  }
  const fileName = fileNameFor(String(type.name), ext, now)

  const jobId = randomUUID()
  const path = `${companyId}/${jobId}.${ext}`
  const storage = supabase.storage.from(bucket)
  const { error: uploadError } = await storage.upload(path, file, { contentType, upsert: false })
  if (uploadError) throw new Error(`export upload failed: ${uploadError.message}`)

  let jobInserted = false
  let exportedIds: string[] = []
  const rollback = async () => {
    if (exportedIds.length > 0) {
      await supabase.from('documents').update({ status: 'approved' }).in('id', exportedIds).eq('company_id', companyId).eq('status', 'exported')
    }
    if (jobInserted) await supabase.from('export_jobs').delete().eq('id', jobId)
    await storage.remove([path])
  }

  try {
    const { data: signed, error: signError } = await storage.createSignedUrl(path, SIGNED_URL_SECONDS, { download: fileName })
    if (signError) throw new Error(`signed URL failed: ${signError.message}`)

    const { error: jobError } = await supabase.from('export_jobs').insert({
      id: jobId,
      company_id: companyId,
      created_by: userId,
      format: request.format,
      type_id: request.typeId,
      document_ids: documents.map((doc) => doc.id),
      destination: 'download',
      columns: mapping,
      status: 'completed',
    })
    if (jobError) throw new Error(`export job insert failed: ${jobError.message}`)
    jobInserted = true

    // Conditional: only approved documents move on. If one changed since it was loaded, undo everything.
    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({ status: 'exported' })
      .in('id', documents.map((doc) => doc.id))
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .select('id')
    if (updateError) throw new Error(`document update failed: ${updateError.message}`)
    exportedIds = updated.map((row) => String(row.id))
    if (exportedIds.length !== documents.length) {
      throw new ExportError(409, 'document_changed', 'A document changed while exporting; nothing was exported')
    }

    // Like the mock, remember the mapping for next time. Not worth failing the export for.
    if (request.columns) {
      const { error: mappingError } = await supabase
        .from('document_types')
        .update({ export_mapping: mapping })
        .eq('id', request.typeId)
        .eq('company_id', companyId)
      if (mappingError) console.error(JSON.stringify({ route: 'POST /exports', error: `mapping save failed: ${mappingError.message}` }))
    }
    return { jobId, url: signed.signedUrl, fileName }
  } catch (error) {
    await rollback().catch(() => undefined) // the original error is the one to report
    throw error
  }
}
