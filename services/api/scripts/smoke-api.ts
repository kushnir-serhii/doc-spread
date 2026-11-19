// Smoke test of the API (spec 022, slice 3). Prints one PASS/FAIL/SKIP line per check, never tokens or keys.
//
//   SMOKE_API_URL=https://doc-spread.vercel.app/api pnpm smoke   -> over HTTP against a deployment
//   pnpm smoke                                                   -> direct mode: the router runs in-process
//
// Both modes use the Supabase project from services/api/.env.local (values already in the environment win).
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { API_ENV_FILE, WEB_ENV_FILE, readEnvFile, requireValue } from './env-file.ts'

const apiEnv = readEnvFile(API_ENV_FILE)
const webEnv = readEnvFile(WEB_ENV_FILE)
const setting = (name: string, values: Record<string, string>, file: string): string =>
  process.env[name] || requireValue(values, name, file)

const supabaseUrl = setting('SUPABASE_URL', apiEnv, 'services/api/.env.local')
const secretKey = setting('SUPABASE_SECRET_KEY', apiEnv, 'services/api/.env.local')
const publishableKey = setting('VITE_SUPABASE_PUBLISHABLE_KEY', webEnv, 'apps/web/.env.local')
const maxBytes = Number(setting('UPLOAD_MAX_BYTES', apiEnv, 'services/api/.env.local'))
const demoEmail = setting('DEMO_USER_EMAIL', apiEnv, 'services/api/.env.local')
const demoPassword = setting('DEMO_USER_PASSWORD', apiEnv, 'services/api/.env.local')
const bucket = process.env.STORAGE_DOCUMENTS_BUCKET || apiEnv.STORAGE_DOCUMENTS_BUCKET || 'documents'
const apiUrl = (process.env.SMOKE_API_URL ?? '').replace(/\/$/, '')

const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

type Handle = (request: Request) => Promise<Response>
let direct: Handle | undefined
if (!apiUrl) {
  // Direct mode: the function's own configuration comes from the same values.
  process.env.SUPABASE_URL = supabaseUrl
  process.env.SUPABASE_SECRET_KEY = secretKey
  process.env.SUPABASE_JWKS_URL ||= apiEnv.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`
  process.env.STORAGE_DOCUMENTS_BUCKET = bucket
  process.env.UPLOAD_MAX_BYTES = String(maxBytes)
  direct = (await import('../src/handler.js')).handle
}
console.log(apiUrl ? `mode: HTTP against ${apiUrl}` : 'mode: direct (router called in-process)')

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures += 1
}
const skip = (label: string, reason: string) => console.log(`SKIP ${label} (${reason})`)

interface ApiResponse {
  status: number
  body: unknown
}
const call = async (path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<ApiResponse> => {
  const headers: Record<string, string> = {
    ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
  }
  const requestInit = {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  }
  const response = direct
    ? await direct(new Request(`http://localhost/api${path}`, requestInit))
    : await fetch(`${apiUrl}${path}`, requestInit)
  const text = await response.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // keep the raw text
  }
  return { status: response.status, body }
}

const errorCode = (body: unknown): string =>
  typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : ''

interface UploadResponse {
  documentId?: string
  upload?: { url?: string; token?: string; path?: string }
  status?: string
}
/** `exists()` throws for a missing object on some versions, so list the folder instead. */
const objectExists = async (path: string): Promise<boolean> => {
  const slash = path.lastIndexOf('/')
  const { data } = await admin.storage.from(bucket).list(path.slice(0, slash), { search: path.slice(slash + 1) })
  return (data ?? []).some((file) => file.name === path.slice(slash + 1))
}
const asUpload = (body: unknown): UploadResponse => body as UploadResponse // our API's response shape

const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
)
const uploadRequest = { fileName: 'smoke test.pdf', fileType: 'pdf', size: pdf.length, contentType: 'application/pdf' }

const health = await call('/health')
check('GET /health returns 200', health.status === 200)
check('POST /uploads without a token returns 401', (await call('/uploads', { method: 'POST', body: {} })).status === 401)
check('POST /uploads with a garbage token returns 401', (await call('/uploads', { method: 'POST', token: 'not.a.jwt', body: {} })).status === 401)
check(
  'POST /uploads/:id/complete without a token returns 401',
  (await call(`/uploads/${randomUUID()}/complete`, { method: 'POST' })).status === 401,
)
check('unknown route returns 404', (await call('/nope')).status === 404)

const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: publishableKey, 'content-type': 'application/json' },
  body: JSON.stringify({ email: demoEmail, password: demoPassword }),
})
const tokenJson: unknown = await tokenResponse.json()
const accessToken =
  typeof tokenJson === 'object' && tokenJson !== null && 'access_token' in tokenJson ? String(tokenJson.access_token) : ''
check('demo user signs in', accessToken !== '', `status ${tokenResponse.status}`)
if (!accessToken) process.exit(1)

const createdDocumentIds: string[] = []
const createdPaths: string[] = []
let throwawayCompanyId = ''

const tooLarge = await call('/uploads', { method: 'POST', token: accessToken, body: { ...uploadRequest, size: maxBytes + 1 } })
check('oversized file returns 400', tooLarge.status === 400, errorCode(tooLarge.body))
const badType = await call('/uploads', {
  method: 'POST',
  token: accessToken,
  body: { ...uploadRequest, fileType: 'exe', contentType: 'application/x-msdownload' },
})
check('fileType exe returns 400', badType.status === 400, errorCode(badType.body))
const badMime = await call('/uploads', { method: 'POST', token: accessToken, body: { ...uploadRequest, contentType: 'image/png' } })
check('mismatching contentType returns 400', badMime.status === 400, errorCode(badMime.body))

// Does this project have the queue wrappers yet? (They arrive with the `queues` migration.)
const probe = await admin.rpc('queue_read', { queue_name: 'ocr', visibility_timeout: 0, quantity: 0 })
const queueReady = probe.error === null
const queueMissing = !queueReady && (probe.error.code === 'PGRST202' || /Could not find the function/i.test(probe.error.message))
if (!queueReady && !queueMissing) check('queue probe', false, probe.error?.message ?? '')

const ok = await call('/uploads', { method: 'POST', token: accessToken, body: uploadRequest })
const created = asUpload(ok.body)
check('valid upload request returns 200', ok.status === 200, `status ${ok.status} ${errorCode(ok.body)}`)
const documentId = created.documentId
const upload = created.upload
if (documentId) createdDocumentIds.push(documentId)

if (documentId && upload?.url && upload.token && upload.path) {
  createdPaths.push(upload.path)
  const { data: row } = await admin.from('documents').select('company_id, status, storage_path').eq('id', documentId).single()
  check(
    'documents row created in the caller company with status uploaded',
    row?.status === 'uploaded' && row.storage_path === upload.path && upload.path.startsWith(`${row.company_id}/${documentId}/`),
  )

  // Before the file is there, complete is refused with 409 (the object is missing).
  const early = await call(`/uploads/${documentId}/complete`, { method: 'POST', token: accessToken })
  check('complete before the upload returns 409', early.status === 409, errorCode(early.body))

  // The browser side: a client with only the publishable key writes with the signed URL's token.
  const browser = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const written = await browser.storage.from(bucket).uploadToSignedUrl(upload.path, upload.token, pdf, { contentType: 'application/pdf' })
  check('uploading the bytes with the signed URL works', written.error === null, written.error?.message ?? '')

  const otherPath = `${randomUUID()}/${randomUUID()}/smoke.pdf`
  createdPaths.push(otherPath)
  const other = await browser.storage.from(bucket).uploadToSignedUrl(otherPath, upload.token, pdf, { contentType: 'application/pdf' })
  check('the same token cannot write another path', other.error !== null)
  check('no object exists at the other path', !(await objectExists(otherPath)))

  // Cross-company: a throwaway company with a document the demo user must not be able to complete.
  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name: `smoke-${randomUUID().slice(0, 8)}`, default_currency: 'USD' })
    .select('id')
    .single()
  if (companyError) {
    check('throwaway company created', false, companyError.message)
  } else {
    throwawayCompanyId = company.id
    const foreignId = randomUUID()
    const foreignPath = `${company.id}/${foreignId}/other.pdf`
    createdPaths.push(foreignPath)
    await admin.storage.from(bucket).upload(foreignPath, pdf, { contentType: 'application/pdf' })
    await admin.from('documents').insert({
      id: foreignId,
      company_id: company.id,
      file_name: 'other.pdf',
      file_type: 'pdf',
      status: 'uploaded',
      storage_path: foreignPath,
    })
    const foreign = await call(`/uploads/${foreignId}/complete`, { method: 'POST', token: accessToken })
    check('complete for another company document returns 404', foreign.status === 404, errorCode(foreign.body))
    const { data: foreignRow } = await admin.from('documents').select('status').eq('id', foreignId).single()
    check('the other company document is untouched', foreignRow?.status === 'uploaded')
  }

  const unknown = await call(`/uploads/${randomUUID()}/complete`, { method: 'POST', token: accessToken })
  check('complete for a random uuid returns 404', unknown.status === 404, errorCode(unknown.body))
  const notUuid = await call('/uploads/not-a-uuid/complete', { method: 'POST', token: accessToken })
  check('complete for a non-uuid id returns 404', notUuid.status === 404, errorCode(notUuid.body))

  if (queueMissing) {
    // Without the queue the enqueue fails; the row must go back to `uploaded` so the call can be retried.
    const noQueue = await call(`/uploads/${documentId}/complete`, { method: 'POST', token: accessToken })
    const { data: after } = await admin.from('documents').select('status').eq('id', documentId).single()
    check('complete without the ocr queue returns 500 and leaves the row uploaded', noQueue.status === 500 && after?.status === 'uploaded')
    skip('complete after the upload returns 202 and the row is processing', 'queue_send does not exist on this project yet')
    skip('a second complete returns 409', 'queue_send does not exist on this project yet')
  } else {
    const done = await call(`/uploads/${documentId}/complete`, { method: 'POST', token: accessToken })
    check('complete after the upload returns 202', done.status === 202 && asUpload(done.body).status === 'processing', `status ${done.status} ${errorCode(done.body)}`)
    const { data: after } = await admin.from('documents').select('status').eq('id', documentId).single()
    check('the row is processing', after?.status === 'processing')
    const again = await call(`/uploads/${documentId}/complete`, { method: 'POST', token: accessToken })
    check('a second complete returns 409', again.status === 409, errorCode(again.body))
    const queued = await admin.rpc('queue_read', { queue_name: 'ocr', visibility_timeout: 1, quantity: 100 })
    const messages = Array.isArray(queued.data) ? (queued.data as { msg_id: number; message: { documentId?: string } }[]) : [] // pgmq rows from queue_read
    const mine = messages.filter((message) => message.message.documentId === documentId)
    check('exactly one ocr message was enqueued', mine.length === 1, `${mine.length}`)
    for (const message of mine) await admin.rpc('queue_delete', { queue_name: 'ocr', message_id: message.msg_id })
  }
}

// Cleanup: test objects, documents rows and the throwaway company (the demo user, company and type stay).
if (createdPaths.length > 0) await admin.storage.from(bucket).remove(createdPaths)
if (createdDocumentIds.length > 0) await admin.from('documents').delete().in('id', createdDocumentIds)
if (throwawayCompanyId) await admin.from('companies').delete().eq('id', throwawayCompanyId) // cascades to its documents
const { count } = await admin.from('documents').select('id', { count: 'exact', head: true }).in('id', createdDocumentIds)
check('test document rows removed', (count ?? 0) === 0)
if (throwawayCompanyId) {
  const { count: companies } = await admin.from('companies').select('id', { count: 'exact', head: true }).eq('id', throwawayCompanyId)
  check('throwaway company removed', (companies ?? 0) === 0)
}

console.log(failures === 0 ? 'ALL PASS' : `${failures} check(s) FAILED`)
process.exit(failures === 0 ? 0 : 1)
