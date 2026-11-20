import type { BBox, DocumentPage, Token } from '@/lib/mock/types'
import { getSupabase } from './client'
import { getSignedFileUrl } from './file-url'

interface PageRow {
  page_index: number
  width: number | string
  height: number | string
  tokens: unknown
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isBBox = (v: unknown): v is BBox =>
  isRecord(v) && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.w === 'number' && typeof v.h === 'number'

const isToken = (v: unknown): v is Token =>
  isRecord(v) && typeof v.id === 'string' && typeof v.text === 'string' && isBBox(v.bbox)

const toTokens = (value: unknown): Token[] => (Array.isArray(value) ? value.filter(isToken) : [])

/**
 * The OCR pages of a document (tokens normalized 0..1 to the page, origin top-left, as stored by the pipeline).
 * A PDF is drawn by the viewer from `Document.file.url`; an image has one page, shown from the signed file URL as `imageUrl`.
 */
export const getDocumentPages = async (id: string): Promise<DocumentPage[]> => {
  const supabase = getSupabase()
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('file_type, storage_path')
    .eq('id', id)
    .maybeSingle()
  if (docError) throw new Error(`Couldn't load the document: ${docError.message}`)
  if (!doc) throw new Error(`Document not found: ${id}`)
  const { data, error } = await supabase
    .from('document_pages')
    .select('page_index, width, height, tokens')
    .eq('document_id', id)
    .order('page_index', { ascending: true })
  if (error) throw new Error(`Couldn't load the pages: ${error.message}`)
  const imageUrl = doc.file_type !== 'pdf' && doc.storage_path ? await getSignedFileUrl(doc.storage_path).catch(() => undefined) : undefined
  return (data as PageRow[]).map((row) => ({
    index: row.page_index,
    width: Number(row.width),
    height: Number(row.height),
    ...(imageUrl ? { imageUrl } : {}),
    tokens: toTokens(row.tokens),
  }))
}
