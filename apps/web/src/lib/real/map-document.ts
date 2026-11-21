import type { Document, DocumentStatus, FieldValue, FileType } from '@/lib/mock/types'

/** A `documents` row as selected by `documents.ts`. */
export interface DocumentRow {
  id: string
  file_name: string
  file_type: string
  page_count: number
  uploaded_at: string
  status: string
  type_id: string | null
  type_version: number | null
  classification_confidence: number | string | null
  values: unknown
  overall_confidence: number | string
  error_message: string | null
  rejection_reason: string | null
  /** optimistic-lock counter, bumped by the database on every update */
  version: number
  storage_path: string | null
}

export const DOCUMENT_COLUMNS =
  'id, file_name, file_type, page_count, uploaded_at, status, type_id, type_version, classification_confidence, values, overall_confidence, error_message, rejection_reason, version, storage_path'

/** `numeric` columns may arrive as strings. */
const num = (value: number | string): number => (typeof value === 'number' ? value : Number(value))

/**
 * One row as the app's `Document`. `file.url` is filled by the caller that needs it (`documents.ts` getDocument).
 * The check constraints on `status` and `file_type` guarantee the casts.
 */
export const toDocument = (row: DocumentRow): Document => ({
  id: row.id,
  file: { name: row.file_name, type: row.file_type as FileType, pageCount: row.page_count, url: '' },
  uploadedAt: row.uploaded_at,
  status: row.status as DocumentStatus,
  typeId: row.type_id,
  typeVersion: row.type_version,
  classification: row.classification_confidence === null ? null : { confidence: num(row.classification_confidence) },
  values: typeof row.values === 'object' && row.values !== null ? (row.values as Record<string, FieldValue>) : {}, // jsonb written in this shape
  overallConfidence: num(row.overall_confidence),
  ...(row.error_message === null ? {} : { errorMessage: row.error_message }),
  ...(row.rejection_reason === null ? {} : { rejectionReason: row.rejection_reason }),
})
