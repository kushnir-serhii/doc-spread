import { downloadDocument, failOn, setDocumentError } from './db.js'
import { recognizeImage } from './ocr-image.js'
import { readPdf } from './ocr-pdf.js'
import type { OcrPage } from './page-types.js'
import { servePipeline, type PipelineContext } from './pipeline-http.js'
import { documentIdOf, PermanentError, sendMessage, type QueueMessage, type WorkResult } from './queue.js'

export const readPages = async (fileType: string, bytes: Buffer): Promise<OcrPage[]> => {
  if (fileType === 'pdf') return readPdf(bytes)
  try {
    return [await recognizeImage(bytes, 0)]
  } catch (error) {
    if (error instanceof PermanentError) throw error
    throw new PermanentError(`unreadable image: ${error instanceof Error ? error.name : 'decode error'}`)
  }
}

const processDocument = async ({ env, supabase }: PipelineContext, documentId: string): Promise<WorkResult> => {
  const { data: row, error } = await supabase
    .from('documents')
    .select('id, company_id, file_type, storage_path')
    .eq('id', documentId)
    .maybeSingle()
  failOn('document lookup', error)
  if (!row) return 'orphan'
  const companyId = String(row.company_id)

  failOn('set processing', (await supabase.from('documents').update({ status: 'processing', error_message: null }).eq('id', documentId)).error)
  const started = Date.now()
  try {
    const pages = await readPages(String(row.file_type), await downloadDocument(supabase, env.documentsBucket, String(row.storage_path)))
    const pageRows = pages.map((page) => ({
      document_id: documentId,
      company_id: companyId,
      page_index: page.index,
      width: page.width,
      height: page.height,
      tokens: page.tokens,
    }))
    failOn('store pages', (await supabase.from('document_pages').upsert(pageRows, { onConflict: 'document_id,page_index' })).error)
    failOn('set page count', (await supabase.from('documents').update({ page_count: pages.length }).eq('id', documentId)).error)
    await sendMessage(supabase, 'extract', { documentId })
    // Counts and time only: never text.
    console.log(
      JSON.stringify({
        event: 'ocr_done',
        documentId,
        pages: pages.length,
        tokens: pages.reduce((sum, page) => sum + page.tokens.length, 0),
        ocrMs: Date.now() - started,
      }),
    )
  } catch (failure) {
    if (!(failure instanceof PermanentError)) throw failure
    // A file that cannot be read: mark it and consume the message, so the queue moves on.
    await setDocumentError(supabase, documentId, failure.message)
    console.warn(JSON.stringify({ event: 'ocr_failed_permanently', documentId, reason: failure.message }))
  }
  return 'done'
}

/** POST /api/pipeline/ocr: drains the `ocr` queue (see apps/web/api/pipeline/ocr.ts). */
export const handleOcr = (request: Request): Promise<Response> =>
  servePipeline(request, 'ocr', {
    work: (ctx, message: QueueMessage) => processDocument(ctx, documentIdOf(message.message)),
    onGiveUp: ({ supabase }, message) => setDocumentError(supabase, documentIdOf(message.message), 'processing failed'),
  })
