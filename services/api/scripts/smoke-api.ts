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

// ---------- POST /signup (spec 023) ----------
const signupUserIds: string[] = []
const signupCompanyIds: string[] = []
const countUsers = async (): Promise<number> => {
  let total = 0
  for (let page = 1; ; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    total += data.users.length
    if (data.users.length < 200) return total
  }
}
{
  const tag = randomUUID().slice(0, 8)
  const companyName = `Smoke Signup ${tag}`
  const email = `smoke-signup-${tag}@example.com`
  const password = `smoke-${randomUUID()}`
  const good = { companyName, email, password }
  const bad = async (label: string, body: unknown, code: string) => {
    const response = await call('/signup', { method: 'POST', body })
    check(`POST /signup ${label} returns 400 ${code}`, response.status === 400 && errorCode(response.body) === code, `status ${response.status} ${errorCode(response.body)}`)
  }
  await bad('without a body', undefined, 'invalid_body')
  await bad('with a one-letter company name', { ...good, companyName: ' a ' }, 'invalid_company_name')
  await bad('with a 101-char company name', { ...good, companyName: 'x'.repeat(101) }, 'invalid_company_name')
  await bad('with a bad email', { ...good, email: 'not-an-email' }, 'invalid_email')
  await bad('with a 7-char password', { ...good, password: '1234567' }, 'invalid_password')

  const usersBefore = await countUsers()
  const created = await call('/signup', { method: 'POST', body: good })
  const createdBody = typeof created.body === 'object' && created.body !== null ? (created.body as { userId?: string; companyId?: string }) : {} // our API's response shape
  check('POST /signup with a new company and email returns 201', created.status === 201 && !!createdBody.userId && !!createdBody.companyId, `status ${created.status} ${errorCode(created.body)}`)
  if (createdBody.userId) signupUserIds.push(createdBody.userId)
  if (createdBody.companyId) signupCompanyIds.push(createdBody.companyId)

  if (createdBody.userId && createdBody.companyId) {
    const browser = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const signedIn = await browser.auth.signInWithPassword({ email, password })
    check('the new user can sign in', signedIn.error === null, signedIn.error?.message ?? '')
    const { data: company } = await admin.from('companies').select('name, default_currency, locale').eq('id', createdBody.companyId).single()
    check('the company has the name, currency USD and no locale', company?.name === companyName && company.default_currency === 'USD' && company.locale === null)
    const { data: members } = await admin.from('team_members').select('user_id, role, status, email').eq('company_id', createdBody.companyId)
    check(
      'team_members has one active owner for the new user',
      members?.length === 1 && members[0]?.user_id === createdBody.userId && members[0].role === 'owner' && members[0].status === 'active',
    )

    const usersAfter = await countUsers()
    for (const variant of [companyName.toUpperCase(), `  ${companyName.toLowerCase().replace(/ /g, '   ')} `]) {
      const taken = await call('/signup', { method: 'POST', body: { companyName: variant, email: `smoke-other-${tag}@example.com`, password } })
      check(`same company name as "${variant.trim()}" returns 409 company_taken`, taken.status === 409 && errorCode(taken.body) === 'company_taken', `status ${taken.status} ${errorCode(taken.body)}`)
    }
    check('a refused company name creates no user', (await countUsers()) === usersAfter && usersAfter === usersBefore + 1)

    const otherCompany = `Smoke Signup Other ${tag}`
    const emailTaken = await call('/signup', { method: 'POST', body: { companyName: otherCompany, email: email.toUpperCase(), password } })
    check('same email with another company returns 409 email_taken', emailTaken.status === 409 && errorCode(emailTaken.body) === 'email_taken', `status ${emailTaken.status} ${errorCode(emailTaken.body)}`)
    const { count: leftover } = await admin.from('companies').select('id', { count: 'exact', head: true }).eq('name', otherCompany)
    check('a refused email creates no company', (leftover ?? 0) === 0)
  }
}
for (const id of signupCompanyIds) await admin.from('companies').delete().in('id', [id]) // cascades to the membership
for (const id of signupUserIds) await admin.auth.admin.deleteUser(id)
if (signupUserIds.length > 0) {
  const { data: leftovers } = await admin.auth.admin.listUsers({ perPage: 200 })
  check('signup test users removed', !leftovers.users.some((user) => signupUserIds.includes(user.id)))
}

// ---------- POST /exports (spec 023, slice 5) ----------
let throwawayExportCompanyId = ''
const exportJobIds: string[] = []
const exportDocumentIds: string[] = []
let exportCompanyId = ''
let exportTypeId = ''
let savedMapping: unknown = null
let keptStatusBefore: string | undefined
const KEPT_INVOICE_ID = '1ca2f69a-bd05-4c74-9790-be62a5ff4e81'
const exportsBucket = process.env.STORAGE_EXPORTS_BUCKET || apiEnv.STORAGE_EXPORTS_BUCKET || 'exports'
{
  const exportCall = (body: unknown, token = accessToken) => call('/exports', { method: 'POST', token, body })
  check('POST /exports without a token returns 401', (await call('/exports', { method: 'POST', body: {} })).status === 401)
  check('POST /exports with a garbage token returns 401', (await exportCall({}, 'not.a.jwt')).status === 401)

  const { data: typeRow } = await admin.from('document_types').select('id, company_id, export_mapping, current_version').eq('name', 'Invoice').limit(1).single()
  const { data: versionRow } = await admin
    .from('document_type_versions')
    .select('fields')
    .eq('type_id', typeRow?.id ?? '')
    .eq('version', typeRow?.current_version ?? 1)
    .single()
  const fields = (Array.isArray(versionRow?.fields) ? versionRow.fields : []) as { id: string; key: string; type: string; columns?: { id: string }[] }[] // jsonb written by the app as FieldDef[]
  const table = fields.find((field) => field.type === 'table')
  const fieldId = (key: string): string => fields.find((field) => field.key === key)?.id ?? ''
  if (!typeRow || fields.length === 0 || !table) {
    check('the demo Invoice type with a table field exists', false)
  } else {
    exportCompanyId = typeRow.company_id
    exportTypeId = typeRow.id
    savedMapping = typeRow.export_mapping
    const { data: kept } = await admin.from('documents').select('status').eq('id', KEPT_INVOICE_ID).maybeSingle()
    keptStatusBefore = kept?.status

    const bad = async (label: string, body: unknown, status: number, code: string) => {
      const response = await exportCall(body)
      check(`POST /exports ${label} returns ${status} ${code}`, response.status === status && errorCode(response.body) === code, `status ${response.status} ${errorCode(response.body)}`)
    }
    await bad('without a body', undefined, 400, 'invalid_body')
    await bad('with a bad typeId', { typeId: 'x', format: 'xlsx' }, 400, 'invalid_type_id')
    await bad('with an unknown format', { typeId: exportTypeId, format: 'ods' }, 400, 'invalid_format')
    await bad('as a PDF bundle', { typeId: exportTypeId, format: 'pdf_bundle' }, 400, 'not_available_yet')
    await bad('by email', { typeId: exportTypeId, format: 'xlsx', destination: 'email' }, 400, 'not_available_yet')
    await bad('with empty documentIds', { typeId: exportTypeId, format: 'xlsx', documentIds: [] }, 400, 'invalid_document_ids')
    await bad('with a malformed mapping', { typeId: exportTypeId, format: 'xlsx', columns: { columns: 'x' } }, 400, 'invalid_columns')
    await bad('for a random type', { typeId: randomUUID(), format: 'xlsx' }, 404, 'not_found')

    // Another company: its type and its document.
    const { data: other } = await admin.from('companies').insert({ name: `smoke-export-${randomUUID().slice(0, 8)}`, default_currency: 'USD' }).select('id').single()
    if (other) {
      throwawayExportCompanyId = other.id
      const { data: foreignType } = await admin.from('document_types').insert({ company_id: other.id, name: 'Foreign' }).select('id').single()
      if (foreignType) {
        await admin.from('document_type_versions').insert({ type_id: foreignType.id, version: 1, company_id: other.id, fields: [] })
        await bad('for the type of another company', { typeId: foreignType.id, format: 'xlsx' }, 404, 'not_found')
      }
      const foreignDoc = randomUUID()
      await admin.from('documents').insert({ id: foreignDoc, company_id: other.id, file_name: 'foreign.pdf', file_type: 'pdf', status: 'approved' })
      await bad('with a document of another company', { typeId: exportTypeId, format: 'xlsx', documentIds: [foreignDoc] }, 404, 'document_not_found')
      const { data: stillApproved } = await admin.from('documents').select('status').eq('id', foreignDoc).single()
      check('the document of the other company is untouched', stillApproved?.status === 'approved')
    }

    // Throwaway documents of the demo Invoice type (the kept invoice is never exported).
    const money = (amount: number, currency: string) => ({ type: 'money', value: { amount, currency }, confidence: 1 })
    const cell = (type: string, value: unknown) => ({ type, value, confidence: 1 })
    const columnId = (name: string): string => table.columns?.find((column) => column.id.endsWith(`-c-${name}`))?.id ?? ''
    const makeValues = (supplier: string, currency: string, gross: number) => ({
      [fieldId('supplier_name')]: cell('text', supplier),
      [fieldId('issue_date')]: cell('date', '2026-10-14'),
      [fieldId('gross_total')]: money(gross, currency),
      [table.id]: {
        type: 'table',
        rows: [1, 2].map((n) => ({
          id: `r${n}`,
          cells: { [columnId('description')]: cell('text', `Item, "${n}"`), [columnId('net')]: money(1000 * n, currency) },
        })),
      },
    })
    const newDocument = async (name: string, status: string, typeId: string | null, values: unknown): Promise<string> => {
      const id = randomUUID()
      const { error } = await admin.from('documents').insert({
        id,
        company_id: exportCompanyId,
        file_name: name,
        file_type: 'pdf',
        status,
        type_id: typeId,
        type_version: typeId ? typeRow.current_version : null,
        values,
      })
      if (error) throw new Error(`throwaway document failed: ${error.message}`)
      exportDocumentIds.push(id)
      return id
    }
    const docA = await newDocument('smoke-export-a.pdf', 'approved', exportTypeId, makeValues('Smoke Ltd', 'USD', 123456))
    const docB = await newDocument('smoke-export-b.pdf', 'approved', exportTypeId, makeValues('Jen Co', 'JPY', 1500))
    const docReview = await newDocument('smoke-export-review.pdf', 'needs_review', exportTypeId, {})
    const docUntyped = await newDocument('smoke-export-untyped.pdf', 'approved', null, {})

    await bad('with a document that needs review', { typeId: exportTypeId, format: 'xlsx', documentIds: [docA, docReview] }, 409, 'document_not_approved')
    await bad('with a document of no type', { typeId: exportTypeId, format: 'xlsx', documentIds: [docA, docUntyped] }, 409, 'document_wrong_type')
    const { data: untouched } = await admin.from('documents').select('id, status').in('id', [docA, docB, docReview])
    check(
      'a refused export changes no document',
      untouched?.find((row) => row.id === docA)?.status === 'approved' && untouched.find((row) => row.id === docReview)?.status === 'needs_review',
    )
    const { count: refusedJobs } = await admin.from('export_jobs').select('id', { count: 'exact', head: true }).eq('type_id', exportTypeId).contains('document_ids', [docA])
    check('a refused export records no job', (refusedJobs ?? 0) === 0)

    interface Exported {
      jobId?: string
      url?: string
      fileName?: string
    }
    const download = async (url: string): Promise<Buffer> => Buffer.from(await (await fetch(url)).arrayBuffer())
    const objectExists = async (jobId: string, ext: string): Promise<boolean> => {
      const { data } = await admin.storage.from(exportsBucket).list(exportCompanyId, { search: `${jobId}.${ext}` })
      return (data ?? []).some((file) => file.name === `${jobId}.${ext}`)
    }
    const flatMapping = {
      columns: fields.map((field) => ({ source: { kind: 'field', fieldId: field.id }, include: true, header: field.key })),
      tables: { [table.id]: 'flatten' },
    }

    // XLSX
    const xlsx = await exportCall({ typeId: exportTypeId, format: 'xlsx', documentIds: [docA, docB] })
    const xlsxBody = xlsx.body as Exported // our API's response shape
    check(
      'POST /exports xlsx returns 200 with jobId, url and fileName',
      xlsx.status === 200 && !!xlsxBody.jobId && !!xlsxBody.url && /^invoice-\d{4}-\d{2}-\d{2}\.xlsx$/.test(xlsxBody.fileName ?? ''),
      `status ${xlsx.status} ${errorCode(xlsx.body)}`,
    )
    if (xlsxBody.jobId && xlsxBody.url) {
      exportJobIds.push(xlsxBody.jobId)
      const bytes = await download(xlsxBody.url)
      check('the signed URL downloads a non-empty .xlsx (zip magic PK)', bytes.length > 100 && bytes.subarray(0, 2).toString('latin1') === 'PK', `${bytes.length} bytes`)
      check('the xlsx object is in the exports bucket under <company>/<job>.xlsx', await objectExists(xlsxBody.jobId, 'xlsx'))
      const { data: job } = await admin.from('export_jobs').select('status, format, destination, type_id, created_by, document_ids, columns').eq('id', xlsxBody.jobId).single()
      check(
        'the export job is recorded as completed with its documents and columns',
        job?.status === 'completed' &&
          job.format === 'xlsx' &&
          job.destination === 'download' &&
          job.type_id === exportTypeId &&
          !!job.created_by &&
          JSON.stringify(job.document_ids) === JSON.stringify([docA, docB]) &&
          !!job.columns,
      )
      const { data: after } = await admin.from('documents').select('id, status').in('id', [docA, docB, docReview])
      check(
        'the exported documents are exported, the others untouched',
        after?.find((row) => row.id === docA)?.status === 'exported' &&
          after.find((row) => row.id === docB)?.status === 'exported' &&
          after.find((row) => row.id === docReview)?.status === 'needs_review',
      )
    }
    await bad('again for exported documents', { typeId: exportTypeId, format: 'xlsx', documentIds: [docA] }, 409, 'document_not_approved')

    // CSV with one table flattened: a single file with a BOM
    await admin.from('documents').update({ status: 'approved' }).in('id', [docA, docB])
    const csv = await exportCall({ typeId: exportTypeId, format: 'csv', documentIds: [docA, docB], columns: flatMapping })
    const csvBody = csv.body as Exported
    check('POST /exports csv returns 200 with a .csv file name', csv.status === 200 && /\.csv$/.test(csvBody.fileName ?? ''), `status ${csv.status} ${errorCode(csv.body)}`)
    if (csvBody.jobId && csvBody.url) {
      exportJobIds.push(csvBody.jobId)
      const bytes = await download(csvBody.url)
      const text = bytes.toString('utf8')
      const lines = text.replace(/^﻿/, '').trim().split('\r\n')
      check(
        'the csv is non-empty, starts with a UTF-8 BOM and has a header plus one row per table row',
        bytes.length > 50 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf && lines.length === 5,
        `${lines.length} lines`,
      )
      check('the csv quotes a field with quotes and a comma (RFC 4180)', text.includes('"Item, ""1"""'))
      check('the csv holds money in major units with the currency next to it', text.includes('1234.56,USD') && text.includes('1500,JPY'))
      const { data: saved } = await admin.from('document_types').select('export_mapping').eq('id', exportTypeId).single()
      check('the mapping sent with the export is saved on the type', !!saved?.export_mapping && JSON.stringify(saved.export_mapping) !== JSON.stringify(savedMapping))
    }

    // CSV with the default mapping: the table goes to its own file, so a zip
    await admin.from('document_types').update({ export_mapping: savedMapping }).eq('id', exportTypeId)
    await admin.from('documents').update({ status: 'approved' }).in('id', [docA, docB])
    const zip = await exportCall({ typeId: exportTypeId, format: 'csv', documentIds: [docA, docB] })
    const zipBody = zip.body as Exported
    check('POST /exports csv with a separate table returns a .zip', zip.status === 200 && /\.zip$/.test(zipBody.fileName ?? ''), `status ${zip.status} ${errorCode(zip.body)}`)
    if (zipBody.jobId && zipBody.url) {
      exportJobIds.push(zipBody.jobId)
      const bytes = await download(zipBody.url)
      check('the zip downloads (PK magic)', bytes.length > 100 && bytes.subarray(0, 2).toString('latin1') === 'PK')
    }

    const { data: keptAfter } = await admin.from('documents').select('status').eq('id', KEPT_INVOICE_ID).maybeSingle()
    check('the kept invoice was not touched by the smoke', keptAfter?.status === keptStatusBefore, `${keptStatusBefore} -> ${keptAfter?.status}`)
  }
}
if (exportJobIds.length > 0) {
  const paths = exportJobIds.flatMap((jobId) => ['xlsx', 'csv', 'zip'].map((ext) => `${exportCompanyId}/${jobId}.${ext}`))
  await admin.storage.from(exportsBucket).remove(paths)
  await admin.from('export_jobs').delete().in('id', exportJobIds)
}
if (exportDocumentIds.length > 0) await admin.from('documents').delete().in('id', exportDocumentIds)
if (exportTypeId) await admin.from('document_types').update({ export_mapping: savedMapping }).eq('id', exportTypeId)
if (throwawayExportCompanyId) await admin.from('companies').delete().eq('id', throwawayExportCompanyId)
if (exportJobIds.length > 0 || exportDocumentIds.length > 0) {
  const { count: jobsLeft } = await admin.from('export_jobs').select('id', { count: 'exact', head: true }).in('id', exportJobIds)
  const { count: docsLeft } = await admin.from('documents').select('id', { count: 'exact', head: true }).in('id', exportDocumentIds)
  check('export test jobs and documents removed', (jobsLeft ?? 0) === 0 && (docsLeft ?? 0) === 0)
}

// ---------- monthly document limit (spec 031, slice 1) ----------
{
  const demoCompanyId = documentId ? ((await admin.from('documents').select('company_id').eq('id', documentId).maybeSingle()).data?.company_id ?? '') : ''
  const limitProbe = demoCompanyId ? await admin.from('companies').select('monthly_document_limit').eq('id', demoCompanyId).single() : undefined
  if (!limitProbe || limitProbe.error) {
    skip('monthly document limit', 'the usage_limits migration is not applied on this database or no demo company')
  } else {
    const originalLimit = limitProbe.data.monthly_document_limit
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const countThisMonth = async (): Promise<number> =>
      (await admin.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', demoCompanyId).gte('uploaded_at', monthStart.toISOString())).count ?? 0
    const used = await countThisMonth()
    await admin.from('companies').update({ monthly_document_limit: used + 1 }).eq('id', demoCompanyId)

    const underLimit = await call('/uploads', { method: 'POST', token: accessToken, body: uploadRequest })
    check('an upload under the limit returns 200', underLimit.status === 200, `status ${underLimit.status} ${errorCode(underLimit.body)}`)
    const underId = asUpload(underLimit.body).documentId
    if (underId) createdDocumentIds.push(underId)
    const underPath = asUpload(underLimit.body).upload?.path
    if (underPath) createdPaths.push(underPath)

    const before = await countThisMonth()
    const atLimit = await call('/uploads', { method: 'POST', token: accessToken, body: uploadRequest })
    const refused = atLimit.body as { error?: string; message?: string; limit?: number; used?: number; resetsAt?: string } // our API's response shape
    check('an upload at the limit returns 409 limit_reached', atLimit.status === 409 && refused.error === 'limit_reached', `status ${atLimit.status} ${errorCode(atLimit.body)}`)
    check('the 409 carries limit, used and resetsAt', refused.limit === used + 1 && refused.used === used + 1 && refused.resetsAt === nextMonth.toISOString(), JSON.stringify({ limit: refused.limit, used: refused.used, resetsAt: refused.resetsAt }))
    check('the refused upload stores no document', (await countThisMonth()) === before)

    await admin.from('companies').update({ monthly_document_limit: originalLimit }).eq('id', demoCompanyId)
    const { data: restored } = await admin.from('companies').select('monthly_document_limit').eq('id', demoCompanyId).single()
    check('the company limit is restored', restored?.monthly_document_limit === originalLimit)
  }
}

// ---------- change a document's type (spec 032, slice 1) ----------
{
  const demoCompanyId = documentId ? ((await admin.from('documents').select('company_id').eq('id', documentId).maybeSingle()).data?.company_id ?? '') : ''
  const columnProbe = demoCompanyId ? await admin.from('documents').select('type_changes').limit(1) : undefined
  if (!demoCompanyId || !columnProbe || columnProbe.error || !queueReady) {
    skip('change type', 'the type_changes migration or the queues are not applied on this database, or no demo company')
  } else {
    const typeCall = (id: string, body: unknown, token = accessToken) => call(`/documents/${id}/type`, { method: 'POST', token, body })
    const changeTypeDocumentIds: string[] = []
    const newDoc = async (status: string, extra: Record<string, unknown> = {}): Promise<string> => {
      const id = randomUUID()
      const { error } = await admin.from('documents').insert({ id, company_id: demoCompanyId, file_name: 'change-type.pdf', file_type: 'pdf', status, ...extra })
      if (error) throw new Error(`insert failed: ${error.message}`)
      changeTypeDocumentIds.push(id)
      return id
    }
    type QueueRow = { msg_id: number; message: { documentId?: string } } // pgmq rows from queue_read
    const readExtract = async (visibilityTimeout: number): Promise<QueueRow[]> => {
      const read = await admin.rpc('queue_read', { queue_name: 'extract', visibility_timeout: visibilityTimeout, quantity: 200 })
      return Array.isArray(read.data) ? (read.data as QueueRow[]) : []
    }
    const mineIn = (rows: QueueRow[]): QueueRow[] => rows.filter((row) => changeTypeDocumentIds.includes(row.message.documentId ?? ''))
    let foreignCompanyId = ''
    try {
      const { data: types } = await admin.from('document_types').select('id').eq('company_id', demoCompanyId).limit(1)
      const typeId = types?.[0]?.id as string | undefined // our own table
      const { data: versions } = typeId
        ? await admin.from('document_type_versions').select('version').eq('type_id', typeId).order('version', { ascending: false }).limit(1)
        : { data: null }
      const latestVersion = versions?.[0]?.version as number | undefined
      if (!typeId || latestVersion === undefined) {
        skip('change type', 'the demo company has no document type')
      } else {
        const state = async (id: string) =>
          (await admin.from('documents').select('status, type_id, type_version, values, overall_confidence, type_changes').eq('id', id).single()).data

        check('POST /documents/:id/type without a token returns 401', (await typeCall(randomUUID(), { typeId }, '')).status === 401)
        const unclassified = await newDoc('unclassified')
        const noBody = await typeCall(unclassified, {})
        const badId = await typeCall(unclassified, { typeId: 'x' })
        check('a body without a valid typeId returns 400 invalid_body', noBody.status === 400 && errorCode(noBody.body) === 'invalid_body' && badId.status === 400)
        const unknownDoc = await typeCall(randomUUID(), { typeId })
        check('an unknown document returns 404 not_found', unknownDoc.status === 404 && errorCode(unknownDoc.body) === 'not_found')

        // a change from needs_review
        const review = await newDoc('needs_review', { values: { x: { type: 'text', value: 'old', confidence: 1 } }, overall_confidence: 0.9 })
        const changed = await typeCall(review, { typeId })
        const changedBody = changed.body as { documentId?: string; status?: string; typeId?: string; typeVersion?: number } // our API's response shape
        check(
          'a change returns 202 with documentId, status processing, typeId and typeVersion',
          changed.status === 202 && changedBody.documentId === review && changedBody.status === 'processing' && changedBody.typeId === typeId && changedBody.typeVersion === latestVersion,
          `status ${changed.status} ${errorCode(changed.body)}`,
        )
        const row = await state(review)
        check(
          'the row is processing with the new type and version, no values and type_changes 1',
          row?.status === 'processing' && row.type_id === typeId && row.type_version === latestVersion && JSON.stringify(row.values) === '{}' && Number(row.overall_confidence) === 0 && row.type_changes === 1,
          JSON.stringify(row),
        )
        const queued = mineIn(await readExtract(1))
        check('exactly one extract message was enqueued', queued.filter((message) => message.message.documentId === review).length === 1, `${queued.length}`)
        for (const message of queued) await admin.rpc('queue_delete', { queue_name: 'extract', message_id: message.msg_id })

        // refused: wrong status (the row is now processing)
        const processing = await typeCall(review, { typeId })
        check('a document being processed returns 409 wrong_status', processing.status === 409 && errorCode(processing.body) === 'wrong_status', `status ${processing.status} ${errorCode(processing.body)}`)
        const uploaded = await newDoc('uploaded')
        check('an uploaded document returns 409 wrong_status', errorCode((await typeCall(uploaded, { typeId })).body) === 'wrong_status')

        // refused: the same type
        await admin.from('documents').update({ status: 'needs_review' }).eq('id', review)
        const same = await typeCall(review, { typeId })
        check('the same type returns 409 same_type', same.status === 409 && errorCode(same.body) === 'same_type', `status ${same.status} ${errorCode(same.body)}`)

        // refused: another company's type and document, nothing changes
        const { data: other } = await admin.from('companies').insert({ name: `smoke-type-${randomUUID().slice(0, 8)}`, default_currency: 'USD' }).select('id').single()
        if (other) {
          foreignCompanyId = other.id
          const { data: foreignType } = await admin.from('document_types').insert({ company_id: other.id, name: 'Foreign' }).select('id').single()
          if (foreignType) await admin.from('document_type_versions').insert({ type_id: foreignType.id, version: 1, company_id: other.id, fields: [] })
          const foreignDoc = randomUUID()
          await admin.from('documents').insert({ id: foreignDoc, company_id: other.id, file_name: 'foreign.pdf', file_type: 'pdf', status: 'unclassified' })
          const beforeForeign = await state(unclassified)
          const foreignTypeResponse = await typeCall(unclassified, { typeId: foreignType?.id })
          check('the type of another company returns 404 type_not_found', foreignTypeResponse.status === 404 && errorCode(foreignTypeResponse.body) === 'type_not_found', `status ${foreignTypeResponse.status} ${errorCode(foreignTypeResponse.body)}`)
          const randomType = await typeCall(unclassified, { typeId: randomUUID() })
          check('an unknown type returns 404 type_not_found', randomType.status === 404 && errorCode(randomType.body) === 'type_not_found')
          check('the refused type changes leave the document as it was', JSON.stringify(await state(unclassified)) === JSON.stringify(beforeForeign))
          const foreignDocResponse = await typeCall(foreignDoc, { typeId })
          check('a document of another company returns 404 not_found', foreignDocResponse.status === 404 && errorCode(foreignDocResponse.body) === 'not_found')
          check('the document of the other company is untouched', (await state(foreignDoc))?.status === 'unclassified')
        }

        // refused: the limit of 3 changes
        await admin.from('documents').update({ type_changes: 3 }).eq('id', unclassified)
        const tooMany = await typeCall(unclassified, { typeId })
        check('a fourth change returns 409 too_many_changes', tooMany.status === 409 && errorCode(tooMany.body) === 'too_many_changes', `status ${tooMany.status} ${errorCode(tooMany.body)}`)
        const afterTooMany = await state(unclassified)
        check('the refused change leaves status and counter as they were', afterTooMany?.status === 'unclassified' && afterTooMany.type_changes === 3)
        check('no extract message was enqueued by the refused calls', mineIn(await readExtract(0)).length === 0)
      }
    } finally {
      for (const message of mineIn(await readExtract(0))) await admin.rpc('queue_delete', { queue_name: 'extract', message_id: message.msg_id })
      if (changeTypeDocumentIds.length > 0) await admin.from('documents').delete().in('id', changeTypeDocumentIds)
      if (foreignCompanyId) await admin.from('companies').delete().eq('id', foreignCompanyId)
    }
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
