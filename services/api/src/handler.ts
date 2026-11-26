// Imports use `.js` specifiers (TypeScript maps them to the `.ts` sources): Vercel's Node builder compiles each
// file in place and leaves specifiers as written, so `.js` is what resolves at runtime. No top-level await here.
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthError, createVerifier } from './auth.js'
import { loadEnv } from './env.js'
import { ExportError, createExport, validateExport } from './export/create-export.js'
import type { Env } from './env.js'
import { SignupError, signup, validateSignup } from './signup.js'
import { sanitizeFileName, validateUpload } from './upload-rules.js'

class HttpError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const json = (status: number, body: unknown): Response => Response.json(body, { status })

/** The documents trigger raises this SQLSTATE with detail `{"limit":N,"used":M}` (migration usage_limits). */
const LIMIT_ERROR_CODE = 'DS001'

class LimitReachedError extends Error {
  readonly limit?: number
  readonly used?: number
  constructor(limit?: number, used?: number) {
    super('The monthly document limit is reached')
    this.limit = limit
    this.used = used
  }
}

const limitReached = (detail: string | null | undefined): LimitReachedError => {
  try {
    const parsed: unknown = JSON.parse(detail ?? '')
    if (typeof parsed === 'object' && parsed !== null) {
      const { limit, used } = parsed as { limit?: unknown; used?: unknown }
      return new LimitReachedError(typeof limit === 'number' ? limit : undefined, typeof used === 'number' ? used : undefined)
    }
  } catch {
    // detail missing or not JSON: answer with what is known
  }
  return new LimitReachedError()
}

/** First day of the next month, 00:00 UTC. */
const nextMonthStart = (now = new Date()): string => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()

interface Context {
  env: Env
  verifyToken: ReturnType<typeof createVerifier>
  /**
   * Server-side client with the secret key. It bypasses row-level security on purpose: the API checks the
   * caller's company itself and then writes on their behalf.
   */
  supabase: SupabaseClient
}

let context: Context | undefined

/** Loaded on the first request, so a missing variable becomes a logged 500 that names it, not a failed import. */
const getContext = (): Context => {
  if (!context) {
    const env = loadEnv()
    context = {
      env,
      verifyToken: createVerifier(env.supabaseUrl, env.supabaseJwksUrl),
      supabase: createClient(env.supabaseUrl, env.supabaseSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    }
  }
  return context
}

const parseBody = async (request: Request): Promise<unknown> => {
  const text = await request.text()
  if (text === '') return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'invalid_json', 'Body is not valid JSON')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The caller's company: the first active membership by creation order (open question: several companies). */
const companyOf = async ({ supabase }: Context, userId: string): Promise<string> => {
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

const createUpload = async (request: Request, ctx: Context): Promise<Response> => {
  const { env, supabase, verifyToken } = ctx
  const { userId } = await verifyToken(request.headers.get('authorization') ?? undefined)
  const validation = validateUpload(await parseBody(request), env.uploadMaxBytes)
  if (!validation.ok) throw new HttpError(400, validation.code, validation.message)
  const { fileName, fileType } = validation.value

  const companyId = await companyOf(ctx, userId)
  const documentId = randomUUID()
  const path = `${companyId}/${documentId}/${sanitizeFileName(fileName)}`

  const { error } = await supabase
    .from('documents')
    .insert({ id: documentId, company_id: companyId, file_name: fileName, file_type: fileType, status: 'uploaded', storage_path: path })
  // The database refuses the insert at the company's monthly limit (trigger, SQLSTATE DS001; spec 031).
  if (error?.code === LIMIT_ERROR_CODE) throw limitReached(error.details)
  if (error) throw new Error(`document insert failed: ${error.message}`)

  try {
    const { data, error: signError } = await supabase.storage.from(env.documentsBucket).createSignedUploadUrl(path)
    if (signError) throw new Error(`signed upload URL failed: ${signError.message}`)
    return json(200, { documentId, upload: { url: data.signedUrl, token: data.token, path: data.path } })
  } catch (signError) {
    await supabase.from('documents').delete().eq('id', documentId)
    throw signError
  }
}

const completeUpload = async (request: Request, ctx: Context, documentId: string): Promise<Response> => {
  const { env, supabase, verifyToken } = ctx
  const { userId } = await verifyToken(request.headers.get('authorization') ?? undefined)
  const companyId = await companyOf(ctx, userId)
  // Same answer for "no such document" and "someone else's document", so ids of other companies don't leak.
  const notFound = new HttpError(404, 'not_found', 'Document not found')
  if (!UUID.test(documentId)) throw notFound

  const { data: document, error } = await supabase
    .from('documents')
    .select('id, company_id, status, storage_path')
    .eq('id', documentId)
    .maybeSingle()
  if (error) throw new Error(`document lookup failed: ${error.message}`)
  if (!document || document.company_id !== companyId) throw notFound
  if (document.status !== 'uploaded') throw new HttpError(409, 'already_completed', 'The upload was already completed')
  if (typeof document.storage_path !== 'string') throw new Error('document has no storage_path')

  // `exists()` reports a missing object as an error, so list the document's folder and look for the exact name.
  const slash = document.storage_path.lastIndexOf('/')
  const folder = document.storage_path.slice(0, slash)
  const fileName = document.storage_path.slice(slash + 1)
  const { data: files, error: listError } = await supabase.storage.from(env.documentsBucket).list(folder, { search: fileName })
  if (listError) throw new Error(`storage lookup failed: ${listError.message}`)
  if (!files.some((file) => file.name === fileName)) throw new HttpError(409, 'file_not_uploaded', 'The file has not been uploaded yet')

  // Conditional update: of two parallel calls only one sees the row still `uploaded`, so only one enqueues.
  const { data: claimed, error: claimError } = await supabase
    .from('documents')
    .update({ status: 'processing' })
    .eq('id', documentId)
    .eq('status', 'uploaded')
    .select('id')
  if (claimError) throw new Error(`document update failed: ${claimError.message}`)
  if (claimed.length === 0) throw new HttpError(409, 'already_completed', 'The upload was already completed')

  const { error: queueError } = await supabase.rpc('queue_send', { queue_name: 'ocr', message: { documentId } })
  if (queueError) {
    await supabase.from('documents').update({ status: 'uploaded' }).eq('id', documentId).eq('status', 'processing')
    throw new Error(`queue_send failed: ${queueError.message}`)
  }
  return json(202, { documentId, status: 'processing' })
}

/** Builds a spreadsheet of approved documents of one type; see `export/create-export.ts`. */
const createExportFile = async (request: Request, ctx: Context): Promise<Response> => {
  const { env, supabase, verifyToken } = ctx
  const { userId } = await verifyToken(request.headers.get('authorization') ?? undefined)
  const validation = validateExport(await parseBody(request))
  if (!validation.ok) throw new HttpError(validation.status, validation.code, validation.message)
  const companyId = await companyOf(ctx, userId)
  const result = await createExport({ supabase, bucket: env.exportsBucket, userId, companyId }, validation.value)
  return json(200, result)
}

/** Public route (no token): creates the user, the company and the owner membership. */
const createAccount = async (request: Request, { supabase }: Context): Promise<Response> => {
  const validation = validateSignup(await parseBody(request))
  if (!validation.ok) throw new HttpError(400, validation.code, validation.message)
  const result = await signup(supabase, validation.value)
  return json(201, result)
}

/** Web-standard handler: takes a Request, returns a Response. The `/api` prefix is optional. */
export const handle = async (request: Request): Promise<Response> => {
  const method = request.method
  const path = new URL(request.url).pathname.replace(/^\/api(?=\/|$)/, '').replace(/(.)\/$/, '$1')
  try {
    if (method === 'GET' && path === '/health') return json(200, { ok: true })
    if (method === 'POST' && path === '/uploads') return await createUpload(request, getContext())
    if (method === 'POST' && path === '/exports') return await createExportFile(request, getContext())
    if (method === 'POST' && path === '/signup') return await createAccount(request, getContext())
    const complete = /^\/uploads\/([^/]+)\/complete$/.exec(path)
    if (method === 'POST' && complete?.[1]) return await completeUpload(request, getContext(), complete[1])
    return json(404, { error: 'not_found', message: 'Unknown route' })
  } catch (error) {
    if (error instanceof AuthError) return json(401, { error: 'unauthorized', message: 'Missing or invalid token' })
    if (error instanceof ExportError) return json(error.status, { error: error.code, message: error.message })
    if (error instanceof SignupError) return json(error.status, { error: error.code, message: error.message })
    if (error instanceof LimitReachedError) {
      return json(409, { error: 'limit_reached', message: error.message, limit: error.limit, used: error.used, resetsAt: nextMonthStart() })
    }
    if (error instanceof HttpError) return json(error.status, { error: error.code, message: error.message })
    // Only the error name and message are logged: never tokens, headers or environment values.
    console.error(JSON.stringify({ route: `${method} ${path}`, error: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' }))
    return json(500, { error: 'internal_error', message: 'Something went wrong' })
  }
}
