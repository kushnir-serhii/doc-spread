import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient, failOn, setDocumentError } from './db.ts'
import { recognizeImage } from './ocr-image.ts'
import { readPdf } from './ocr-pdf.ts'
import type { OcrPage } from './page-types.ts'
import { loadOcrEnv } from './pipeline-env.ts'
import { PermanentError, runBatch, type SqsBatchResponse, type SqsEvent, type SqsRecord } from './sqs.ts'

// Top-level await: a missing variable fails the cold start and the error names it.
const env = await loadOcrEnv()
const supabase: SupabaseClient = createAdminClient(env.supabaseUrl, env.supabaseSecretKey)
const s3 = new S3Client({})
const sqs = new SQSClient({})

/** Message body of the extract queue. */
export interface ExtractMessage {
  documentId: string
  companyId: string
}

interface S3ObjectRef {
  bucket: string
  key: string
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** S3 ObjectCreated records of one SQS message. An S3 test event has none. */
const objectsOf = (body: string): S3ObjectRef[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new PermanentError('message is not JSON')
  }
  const records = isObject(parsed) && Array.isArray(parsed.Records) ? parsed.Records : []
  const refs: S3ObjectRef[] = []
  for (const record of records) {
    const s3Part = isObject(record) ? record.s3 : undefined
    if (!isObject(s3Part) || !isObject(s3Part.bucket) || !isObject(s3Part.object)) continue
    const bucket = s3Part.bucket.name
    const key = s3Part.object.key
    if (typeof bucket !== 'string' || typeof key !== 'string') continue
    // S3 URL-encodes keys in event notifications (spaces become +).
    refs.push({ bucket, key: decodeURIComponent(key.replace(/\+/g, ' ')) })
  }
  return refs
}

const readObject = async (ref: S3ObjectRef): Promise<Buffer> => {
  const result = await s3.send(new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key }))
  if (!result.Body) throw new PermanentError('empty object')
  return Buffer.from(await result.Body.transformToByteArray())
}

const readPages = async (fileType: string, bytes: Buffer): Promise<OcrPage[]> => {
  if (fileType === 'pdf') return readPdf(bytes)
  try {
    return [await recognizeImage(bytes, 0)]
  } catch (error) {
    if (error instanceof PermanentError) throw error
    throw new PermanentError(`unreadable image: ${error instanceof Error ? error.name : 'decode error'}`)
  }
}

const processObject = async (ref: S3ObjectRef): Promise<void> => {
  if (ref.bucket !== env.documentsBucket) return
  const [companyId, documentId] = ref.key.split('/')
  if (!companyId || !documentId) return
  const { data: row, error } = await supabase
    .from('documents')
    .select('id, company_id, file_type, storage_path')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .maybeSingle()
  failOn('document lookup', error)
  // An object without a documents row, or not the one the row points at, is not ours to process.
  if (!row || row.storage_path !== ref.key) {
    console.warn(JSON.stringify({ event: 'ocr_skipped', reason: 'no matching document row' }))
    return
  }

  failOn('set processing', (await supabase.from('documents').update({ status: 'processing', error_message: null }).eq('id', documentId)).error)
  const started = Date.now()
  try {
    const pages = await readPages(String(row.file_type), await readObject(ref))
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
    const message: ExtractMessage = { documentId, companyId }
    await sqs.send(new SendMessageCommand({ QueueUrl: env.extractQueueUrl ?? '', MessageBody: JSON.stringify(message) }))
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
}

const documentIdOf = (record: SqsRecord): string[] =>
  objectsOf(record.body).flatMap((ref) => {
    const id = ref.key.split('/')[1]
    return id ? [id] : []
  })

export const handler = async (event: SqsEvent): Promise<SqsBatchResponse> =>
  runBatch(
    event,
    async (record) => {
      for (const ref of objectsOf(record.body)) await processObject(ref)
    },
    // Last receive before the dead-letter queue: show the failure on the document.
    async (record) => {
      for (const id of documentIdOf(record)) await setDocumentError(supabase, id, 'processing failed')
    },
  )
