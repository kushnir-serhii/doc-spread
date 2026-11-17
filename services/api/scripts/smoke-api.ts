// Smoke test of the deployed dev API (spec 020, slice 5). Prints one PASS/FAIL line per check, never tokens or keys.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { API_ENV_FILE, WEB_ENV_FILE, readEnvFile, requireValue } from './env-file.ts'

process.env.AWS_PROFILE ??= 'docspread'
process.env.AWS_REGION ??= 'eu-north-1'

const outputs: Record<string, Record<string, string>> = JSON.parse(
  readFileSync(new URL('../../../infra/cdk-outputs-dev.json', import.meta.url), 'utf8'),
) // written by cdk deploy
const apiUrl = (outputs['DocSpread-dev']?.ApiUrl ?? '').replace(/\/$/, '')
const bucket = outputs['DocSpread-dev']?.DocumentsBucketName ?? ''
if (!apiUrl || !bucket) throw new Error('ApiUrl or DocumentsBucketName missing in infra/cdk-outputs-dev.json')

const apiEnv = readEnvFile(API_ENV_FILE)
const webEnv = readEnvFile(WEB_ENV_FILE)
const supabaseUrl = requireValue(apiEnv, 'SUPABASE_URL', 'services/api/.env.local')
const publishableKey = requireValue(webEnv, 'VITE_SUPABASE_PUBLISHABLE_KEY', 'apps/web/.env.local')
const maxBytes = Number(requireValue(apiEnv, 'UPLOAD_MAX_BYTES', 'services/api/.env.local'))
const admin = createClient(supabaseUrl, requireValue(apiEnv, 'SUPABASE_SECRET_KEY', 'services/api/.env.local'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures += 1
}

interface ApiResponse {
  status: number
  body: unknown
}
const call = async (path: string, init: { method?: string; token?: string; body?: unknown } = {}): Promise<ApiResponse> => {
  const response = await fetch(`${apiUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
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

const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
)

const postToS3 = async (url: string, fields: Record<string, string>, contentType = 'application/pdf'): Promise<number> => {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  form.append('file', new Blob([pdf], { type: contentType }), 'smoke.pdf') // the file field goes last
  return (await fetch(url, { method: 'POST', body: form })).status
}

const health = await call('/health')
check('GET /health returns 200', health.status === 200)
const noToken = await call('/uploads', { method: 'POST', body: {} })
check('POST /uploads without a token returns 401', noToken.status === 401)
const badToken = await call('/uploads', { method: 'POST', token: 'not.a.jwt', body: {} })
check('POST /uploads with a garbage token returns 401', badToken.status === 401)
const unknown = await call('/nope')
check('unknown route returns 404', unknown.status === 404)

const demoEmail = requireValue(apiEnv, 'DEMO_USER_EMAIL', 'services/api/.env.local')
const demoPassword = requireValue(apiEnv, 'DEMO_USER_PASSWORD', 'services/api/.env.local')
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
const createdKeys: string[] = []

const request = { fileName: 'smoke test.pdf', fileType: 'pdf', size: pdf.length, contentType: 'application/pdf' }
const ok = await call('/uploads', { method: 'POST', token: accessToken, body: request })
const okBody = ok.body as { documentId?: string; upload?: { url?: string; fields?: Record<string, string> } } // our API's response shape
check('valid upload request returns 200', ok.status === 200, `status ${ok.status} ${errorCode(ok.body)}`)
const upload = okBody.upload
if (okBody.documentId) createdDocumentIds.push(okBody.documentId)

if (upload?.url && upload.fields && okBody.documentId) {
  const fields = upload.fields
  const key = fields.key ?? ''
  createdKeys.push(key)
  const { data: row } = await admin.from('documents').select('company_id, status, storage_path').eq('id', okBody.documentId).single()
  check(
    'documents row created in the caller company with status uploaded',
    row?.status === 'uploaded' && row.storage_path === key && key.startsWith(`${row.company_id}/${okBody.documentId}/`),
  )

  const policy: { conditions: unknown[] } = JSON.parse(Buffer.from(fields.Policy ?? fields.policy ?? '', 'base64').toString('utf8')) // S3 policy document
  const conditionText = JSON.stringify(policy.conditions)
  check(
    'policy pins the exact key and the length range',
    conditionText.includes(JSON.stringify(['eq', '$key', key])) &&
      conditionText.includes(JSON.stringify(['content-length-range', 1, maxBytes])),
  )

  check('upload to the presigned POST returns 204', (await postToS3(upload.url, fields)) === 204)

  const otherKey = `${randomUUID()}/${randomUUID()}/smoke.pdf`
  createdKeys.push(otherKey)
  check('same fields with a key under another company prefix returns 403', (await postToS3(upload.url, { ...fields, key: otherKey })) === 403)
  check(
    'same fields with a different Content-Type returns 403',
    (await postToS3(upload.url, { ...fields, 'Content-Type': 'image/png' }, 'image/png')) === 403,
  )
}

const tooLarge = await call('/uploads', { method: 'POST', token: accessToken, body: { ...request, size: 25 * 1024 * 1024 } })
check('25 MB size returns 400', tooLarge.status === 400, errorCode(tooLarge.body))
const badType = await call('/uploads', { method: 'POST', token: accessToken, body: { ...request, fileType: 'exe', contentType: 'application/x-msdownload' } })
check('fileType exe returns 400', badType.status === 400, errorCode(badType.body))
const badMime = await call('/uploads', { method: 'POST', token: accessToken, body: { ...request, contentType: 'image/png' } })
check('mismatching contentType returns 400', badMime.status === 400, errorCode(badMime.body))

// Cleanup: the test object and its documents row (the demo user, company and type stay).
const s3 = new S3Client({})
for (const key of createdKeys) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
if (createdDocumentIds.length > 0) await admin.from('documents').delete().in('id', createdDocumentIds)
const { count } = await admin.from('documents').select('id', { count: 'exact', head: true }).in('id', createdDocumentIds)
check('test document rows removed', (count ?? 0) === 0)

console.log(failures === 0 ? 'ALL PASS' : `${failures} check(s) FAILED`)
process.exit(failures === 0 ? 0 : 1)
