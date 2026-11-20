import type { Document, ListDocumentsParams } from '@/lib/mock/types'
import { getSupabase } from './client'
import { toDocument, DOCUMENT_COLUMNS } from './map-document'
import type { DocumentRow } from './map-document'
import { notAvailableYet } from './not-available'

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
  return (data as DocumentRow[]).map(toDocument)
}

export const getDocument = async (id: string): Promise<Document> => {
  const { data, error } = await getSupabase().from('documents').select(DOCUMENT_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new Error(`Couldn't load the document: ${error.message}`)
  if (!data) throw new Error(`Document not found: ${id}`)
  return toDocument(data as DocumentRow)
}
