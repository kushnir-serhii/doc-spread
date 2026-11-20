import type { Document, FieldValue, ListDocumentsParams } from '@/lib/mock/types'
import { findValueMismatches } from '@/lib/mock/value-check'
import { confirm, overallConfidence } from '@/lib/mock/value-builders'
import { getSupabase } from './client'
import { getDocumentType } from './document-types'
import { getSignedFileUrl } from './file-url'
import { toDocument, DOCUMENT_COLUMNS } from './map-document'
import type { DocumentRow } from './map-document'
import { notAvailableYet } from './not-available'

/**
 * The `version` each document had when the app last loaded or saved it. A value edit is checked against it, so an
 * edit made on top of a copy that changed elsewhere is refused (the mock `Document` type has no version field).
 */
const seenVersions = new Map<string, number>()

const load = (row: DocumentRow): Document => {
  seenVersions.set(row.id, row.version)
  return toDocument(row)
}

/** Escapes `\`, `%` and `_` so the search text is matched literally by `ilike`. */
const likePattern = (text: string): string => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/** The caller's company documents (RLS), newest first. Search matches the file name. */
export const listDocuments = async (params: ListDocumentsParams = {}): Promise<Document[]> => {
  if (params.group) throw notAvailableYet('Filtering by group')
  let query = getSupabase().from('documents').select(DOCUMENT_COLUMNS).order('uploaded_at', { ascending: false })
  if (params.typeId) query = query.eq('type_id', params.typeId)
  if (params.status) query = query.eq('status', params.status)
  const search = params.search?.trim()
  if (search) query = query.ilike('file_name', likePattern(search))
  const { data, error } = await query
  if (error) throw new Error(`Couldn't load the documents: ${error.message}`)
  return (data as DocumentRow[]).map(load)
}

export const getDocument = async (id: string): Promise<Document> => {
  const { data, error } = await getSupabase().from('documents').select(DOCUMENT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new Error(`Couldn't load the document: ${error.message}`)
  if (!data) throw new Error(`Document not found: ${id}`)
  const row = data as DocumentRow
  const doc = load(row)
  // a missing file must not hide the values: the viewer shows its own error for an empty url
  if (row.storage_path) doc.file.url = await getSignedFileUrl(row.storage_path).catch(() => '')
  return doc
}

const fetchRow = async (id: string): Promise<DocumentRow> => {
  const { data, error } = await getSupabase().from('documents').select(DOCUMENT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new Error(`Couldn't load the document: ${error.message}`)
  if (!data) throw new Error(`Document not found: ${id}`)
  return data as DocumentRow
}

const CONFLICT = 'This document was changed elsewhere. Reload it and try again.'
const EDITABLE_STATUSES: string[] = ['needs_review', 'approved', 'rejected']

/**
 * Merges the edited values (confidence 1), checks them against the type version the document was extracted with and
 * stores them with the overall confidence. Conflict when the row's `version` is no longer the one the app saw.
 */
export const updateDocumentValues = async (id: string, patch: Record<string, FieldValue>): Promise<Document> => {
  const row = await fetchRow(id)
  const seen = seenVersions.get(id)
  if (seen !== undefined && seen !== row.version) throw new Error(CONFLICT)
  if (!EDITABLE_STATUSES.includes(row.status)) throw new Error(`Document can't be edited in status ${row.status}`)
  const doc = toDocument(row)
  const type = doc.typeId === null || doc.typeVersion === null ? undefined : await getDocumentType(doc.typeId, doc.typeVersion)
  const values = { ...doc.values }
  for (const [fieldId, value] of Object.entries(patch)) values[fieldId] = confirm(value)
  const problems = findValueMismatches({ ...doc, values }, type)
  if (problems.length > 0) throw new Error(`Invalid values: ${problems.join('; ')}`)
  const { data, error } = await getSupabase()
    .from('documents')
    .update({ values, overall_confidence: overallConfidence(values) })
    .eq('id', id)
    .eq('version', row.version)
    .select(DOCUMENT_COLUMNS)
  if (error) throw new Error(`Couldn't save the values: ${error.message}`)
  if (data.length === 0) throw new Error(CONFLICT)
  return load(data[0] as DocumentRow)
}

/** needs_review | rejected -> approved (the rejection reason is cleared); other statuses are left as they are. */
export const approveDocuments = async (ids: string[]): Promise<Document[]> => {
  const out: Document[] = []
  for (const id of ids) {
    const { data, error } = await getSupabase()
      .from('documents')
      .update({ status: 'approved', rejection_reason: null })
      .eq('id', id)
      .in('status', ['needs_review', 'rejected'])
      .select(DOCUMENT_COLUMNS)
    if (error) throw new Error(`Couldn't approve the document: ${error.message}`)
    out.push(load(data.length > 0 ? (data[0] as DocumentRow) : await fetchRow(id)))
  }
  return out
}

/** needs_review | unclassified | approved -> rejected, with the reason. */
export const rejectDocument = async (id: string, reason: string): Promise<Document> => {
  const { data, error } = await getSupabase()
    .from('documents')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', id)
    .in('status', ['needs_review', 'unclassified', 'approved'])
    .select(DOCUMENT_COLUMNS)
  if (error) throw new Error(`Couldn't reject the document: ${error.message}`)
  if (data.length > 0) return load(data[0] as DocumentRow)
  const row = await fetchRow(id)
  throw new Error(`Document can't be rejected in status ${row.status}`)
}
