import type { SupabaseClient } from '@supabase/supabase-js'

/** Statuses from which the type may be changed. `uploaded`, `processing`, `exported` and `error` are refused. */
const CHANGEABLE_STATUSES = ['needs_review', 'unclassified', 'approved', 'rejected']

/** Each change re-runs extraction (costs money), so a document may change type this many times (spec 032). */
export const MAX_TYPE_CHANGES = 3

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class ChangeTypeError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** Body of `POST /documents/:id/type`: `{ typeId: uuid }`. */
export const validateChangeType = (body: unknown): string => {
  const typeId = typeof body === 'object' && body !== null && 'typeId' in body ? body.typeId : undefined
  if (typeof typeId !== 'string' || !UUID.test(typeId)) throw new ChangeTypeError(400, 'invalid_body', 'typeId must be the id of a document type')
  return typeId
}

export interface ChangeTypeResult {
  documentId: string
  status: 'processing'
  typeId: string
  typeVersion: number
}

/**
 * Gives a document another type and queues its extraction again (OCR pages are already stored, so only `extract` runs;
 * the extract step sees `type_id` and skips classification). The caller has checked the token and found `companyId`.
 */
export const changeDocumentType = async (
  supabase: SupabaseClient,
  companyId: string,
  documentId: string,
  typeId: string,
): Promise<ChangeTypeResult> => {
  // Same answer for "no such document" and "someone else's document", so ids of other companies don't leak.
  const notFound = new ChangeTypeError(404, 'not_found', 'Document not found')
  if (!UUID.test(documentId)) throw notFound
  const { data: document, error } = await supabase
    .from('documents')
    .select('id, company_id, status, type_id, type_version, classification_confidence, overall_confidence, values, error_message, rejection_reason, type_changes')
    .eq('id', documentId)
    .maybeSingle()
  if (error) throw new Error(`document lookup failed: ${error.message}`)
  if (!document || document.company_id !== companyId) throw notFound

  const typeNotFound = new ChangeTypeError(404, 'type_not_found', 'Document type not found')
  const { data: type, error: typeError } = await supabase.from('document_types').select('id').eq('id', typeId).eq('company_id', companyId).maybeSingle()
  if (typeError) throw new Error(`type lookup failed: ${typeError.message}`)
  if (!type) throw typeNotFound
  const { data: versions, error: versionError } = await supabase
    .from('document_type_versions')
    .select('version')
    .eq('type_id', typeId)
    .eq('company_id', companyId)
    .order('version', { ascending: false })
    .limit(1)
  if (versionError) throw new Error(`type version lookup failed: ${versionError.message}`)
  const typeVersion = versions[0]?.version
  if (typeof typeVersion !== 'number') throw typeNotFound

  if (!CHANGEABLE_STATUSES.includes(String(document.status))) {
    throw new ChangeTypeError(409, 'wrong_status', 'The type of a document in this status cannot be changed')
  }
  const changes = Number(document.type_changes)
  if (changes >= MAX_TYPE_CHANGES) {
    throw new ChangeTypeError(409, 'too_many_changes', `The type of a document can be changed at most ${MAX_TYPE_CHANGES} times`)
  }
  // A document without a type (unclassified) never matches; a typed one already has this type.
  if (document.type_id === typeId) throw new ChangeTypeError(409, 'same_type', 'The document already has this type')

  // Conditional update: of two parallel calls only one still sees this status and counter, so only one enqueues.
  const { data: claimed, error: claimError } = await supabase
    .from('documents')
    .update({
      type_id: typeId,
      type_version: typeVersion,
      values: {},
      overall_confidence: 0,
      classification_confidence: null,
      rejection_reason: null,
      error_message: null,
      status: 'processing',
      type_changes: changes + 1,
    })
    .eq('id', documentId)
    .eq('company_id', companyId)
    .eq('status', document.status)
    .eq('type_changes', changes)
    .select('id')
  if (claimError) throw new Error(`document update failed: ${claimError.message}`)
  if (claimed.length === 0) throw new ChangeTypeError(409, 'conflict', 'The document was changed meanwhile; try again')

  const { error: queueError } = await supabase.rpc('queue_send', { queue_name: 'extract', message: { documentId } })
  if (queueError) {
    await supabase
      .from('documents')
      .update({
        type_id: document.type_id,
        type_version: document.type_version,
        values: document.values,
        overall_confidence: document.overall_confidence,
        classification_confidence: document.classification_confidence,
        rejection_reason: document.rejection_reason,
        error_message: document.error_message,
        status: document.status,
        type_changes: changes,
      })
      .eq('id', documentId)
      .eq('status', 'processing')
      .eq('type_changes', changes + 1)
    throw new Error(`queue_send failed: ${queueError.message}`)
  }
  return { documentId, status: 'processing', typeId, typeVersion }
}
