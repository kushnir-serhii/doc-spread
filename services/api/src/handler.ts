import { randomUUID } from 'node:crypto'
import { S3Client } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createClient } from '@supabase/supabase-js'
import { AuthError, createVerifier } from './auth.ts'
import { getEnv } from './env.ts'
import { sanitizeFileName, validateUpload } from './upload-rules.ts'

/** The parts of a Lambda Function URL event (payload v2) this handler reads. */
interface FunctionUrlEvent {
  rawPath: string
  headers?: Record<string, string | undefined>
  body?: string
  isBase64Encoded?: boolean
  requestContext: { http: { method: string } }
}

interface FunctionUrlResult {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const PRESIGN_EXPIRES_SECONDS = 300

class HttpError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const json = (statusCode: number, body: unknown): FunctionUrlResult => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

// Top-level await: a missing variable fails the cold start and the error names it.
const env = await getEnv()
const verifyToken = createVerifier(env.supabaseUrl, env.supabaseJwksUrl)
// Server-side client with the secret key. It bypasses row-level security on purpose: the API checks the
// caller's company itself and then writes on their behalf.
const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const s3 = new S3Client({})

const parseBody = (event: FunctionUrlEvent): unknown => {
  if (!event.body) return undefined
  const text = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'invalid_json', 'Body is not valid JSON')
  }
}

/** The caller's company: the first active membership by creation order (open question: several companies). */
const companyOf = async (userId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('team_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw new Error(`membership lookup failed: ${error.message}`)
  const companyId = data[0]?.company_id
  if (typeof companyId !== 'string') throw new HttpError(403, 'no_company', 'The user belongs to no company')
  return companyId
}

const createUpload = async (event: FunctionUrlEvent): Promise<FunctionUrlResult> => {
  const { userId } = await verifyToken(event.headers?.authorization)
  const validation = validateUpload(parseBody(event), env.uploadMaxBytes)
  if (!validation.ok) throw new HttpError(400, validation.code, validation.message)
  const { fileName, fileType, contentType } = validation.value

  const companyId = await companyOf(userId)
  const documentId = randomUUID()
  const key = `${companyId}/${documentId}/${sanitizeFileName(fileName)}`

  const { error } = await supabase
    .from('documents')
    .insert({ id: documentId, company_id: companyId, file_name: fileName, file_type: fileType, status: 'uploaded', storage_path: key })
  if (error) throw new Error(`document insert failed: ${error.message}`)

  try {
    const upload = await createPresignedPost(s3, {
      Bucket: env.documentsBucket,
      Key: key,
      Fields: { 'Content-Type': contentType },
      Conditions: [
        ['eq', '$key', key],
        ['content-length-range', 1, env.uploadMaxBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Expires: PRESIGN_EXPIRES_SECONDS,
    })
    return json(200, { documentId, upload: { url: upload.url, fields: upload.fields } })
  } catch (presignError) {
    await supabase.from('documents').delete().eq('id', documentId)
    throw presignError
  }
}

export const handler = async (event: FunctionUrlEvent): Promise<FunctionUrlResult> => {
  const method = event.requestContext.http.method
  const path = event.rawPath
  try {
    if (method === 'GET' && path === '/health') return json(200, { ok: true })
    if (method === 'POST' && path === '/uploads') return await createUpload(event)
    return json(404, { error: 'not_found', message: 'Unknown route' })
  } catch (error) {
    if (error instanceof AuthError) return json(401, { error: 'unauthorized', message: 'Missing or invalid token' })
    if (error instanceof HttpError) return json(error.status, { error: error.code, message: error.message })
    // Only the error name and message are logged: never tokens, headers or environment values.
    console.error(JSON.stringify({ route: `${method} ${path}`, error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' }))
    return json(500, { error: 'internal_error', message: 'Something went wrong' })
  }
}
