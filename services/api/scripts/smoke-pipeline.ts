// Smoke test of the deployed dev pipeline (spec 020, slice 6). Prints PASS/FAIL lines and a summary,
// never document values or text, tokens or keys.
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { API_ENV_FILE, WEB_ENV_FILE, readEnvFile, requireValue } from './env-file.ts'

process.env.AWS_PROFILE ??= 'docspread'
process.env.AWS_REGION ??= 'eu-north-1'

/** apps/web LOW_CONFIDENCE (src/lib/fields/confidence.ts): below this a value counts as unverified. */
const LOW_CONFIDENCE = 0.9
const POLL_MS = 5000
const TIMEOUT_MS = 5 * 60 * 1000
const FINAL = new Set(['needs_review', 'unclassified', 'error'])

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
const admin = createClient(supabaseUrl, requireValue(apiEnv, 'SUPABASE_SECRET_KEY', 'services/api/.env.local'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures += 1
}

const signIn = async (): Promise<string> => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: requireValue(apiEnv, 'DEMO_USER_EMAIL', 'services/api/.env.local'),
      password: requireValue(apiEnv, 'DEMO_USER_PASSWORD', 'services/api/.env.local'),
    }),
  })
  const json: unknown = await response.json()
  return typeof json === 'object' && json !== null && 'access_token' in json ? String(json.access_token) : ''
}

interface Upload {
  label: string
  documentId: string
  key: string
}

const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' } as const
type Kind = keyof typeof MIME

const upload = async (token: string, label: string, fileName: string, kind: Kind, bytes: Buffer): Promise<Upload> => {
  const response = await fetch(`${apiUrl}/uploads`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fileName, fileType: kind, size: bytes.length, contentType: MIME[kind] }),
  })
  const body = (await response.json()) as { documentId?: string; upload?: { url: string; fields: Record<string, string> } } // our API's response shape
  if (!response.ok || !body.documentId || !body.upload) throw new Error(`${label}: POST /uploads returned ${response.status}`)
  const form = new FormData()
  for (const [name, value] of Object.entries(body.upload.fields)) form.append(name, value)
  form.append('file', new Blob([new Uint8Array(bytes)], { type: MIME[kind] }), fileName) // the file field goes last
  const s3Response = await fetch(body.upload.url, { method: 'POST', body: form })
  if (s3Response.status !== 204) throw new Error(`${label}: S3 upload returned ${s3Response.status}`)
  return { label, documentId: body.documentId, key: body.upload.fields.key ?? '' }
}

interface DocRow {
  id: string
  status: string
  page_count: number
  values: Record<string, unknown>
  overall_confidence: number
  classification_confidence: number | null
  type_id: string | null
  error_message: string | null
}

const fetchRow = async (id: string): Promise<DocRow> => {
  const { data, error } = await admin
    .from('documents')
    .select('id, status, page_count, values, overall_confidence, classification_confidence, type_id, error_message')
    .eq('id', id)
    .single()
  if (error) throw new Error(`row lookup failed: ${error.message}`)
  return data as DocRow // columns selected above
}

/** Polls until the document leaves uploaded/processing, or the time is up. */
const waitFinal = async (id: string, deadline: number): Promise<DocRow> => {
  for (;;) {
    const row = await fetchRow(id)
    if (FINAL.has(row.status) || Date.now() > deadline) return row
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Every scalar value of the document (table cells included). */
const scalarsOf = (values: Record<string, unknown>): Record<string, unknown>[] =>
  Object.values(values).flatMap((value) => {
    if (!isObject(value)) return []
    if (value.type === 'table' && Array.isArray(value.rows)) {
      return value.rows.flatMap((row: unknown) => (isObject(row) && isObject(row.cells) ? Object.values(row.cells).filter(isObject) : []))
    }
    return [value]
  })

interface Summary {
  label: string
  status: string
  pages: number
  tokens: number
  fields: number
  confidence: number
}

const verify = async (item: Upload, row: DocRow, expect: 'needs_review' | 'final'): Promise<Summary> => {
  const { data: pages } = await admin.from('document_pages').select('page_index, width, height, tokens').eq('document_id', item.documentId)
  const pageRows = pages ?? []
  const tokens = pageRows.flatMap((page) => (Array.isArray(page.tokens) ? (page.tokens as { bbox: { x: number; y: number; w: number; h: number } }[]) : [])) // our OCR output
  const inRange = (n: number) => n >= 0 && n <= 1
  const boxesOk = tokens.every(({ bbox }) => inRange(bbox.x) && inRange(bbox.y) && inRange(bbox.x + bbox.w + 1e-6) && inRange(bbox.y + bbox.h + 1e-6) && bbox.w >= 0 && bbox.h >= 0)
  const scalars = scalarsOf(row.values)
  const fieldCount = Object.keys(row.values).length

  check(`${item.label}: reached a final status`, FINAL.has(row.status), row.status)
  if (expect === 'needs_review') check(`${item.label}: status is needs_review`, row.status === 'needs_review', row.status)
  check(`${item.label}: page rows exist and match page_count`, pageRows.length > 0 && pageRows.length === row.page_count, `${pageRows.length} rows, page_count ${row.page_count}`)
  check(`${item.label}: ${tokens.length} tokens, every bbox within 0..1`, tokens.length > 0 && boxesOk)
  if (row.status === 'needs_review') {
    check(`${item.label}: values present, each with a confidence 0..1`, fieldCount > 0 && scalars.every((s) => typeof s.confidence === 'number' && inRange(s.confidence)), `${fieldCount} fields`)
    check(`${item.label}: type, version and classification confidence stored`, row.type_id !== null && row.classification_confidence !== null)
    const money = scalars.filter((s) => s.type === 'money' && isObject(s.value))
    const moneyOk = money.every((s) => {
      const value = s.value as { amount?: unknown; currency?: unknown } // checked below
      return Number.isInteger(value.amount) && typeof value.currency === 'string' && /^[A-Z]{3}$/.test(value.currency)
    })
    check(`${item.label}: ${money.length} money value(s) are integer minor units with an ISO currency`, moneyOk)
    check(`${item.label}: overall confidence is a number 0..1`, typeof row.overall_confidence === 'number' && inRange(row.overall_confidence))
  }
  return { label: item.label, status: row.status, pages: pageRows.length, tokens: tokens.length, fields: fieldCount, confidence: Number(row.overall_confidence) }
}

const awsLogs = (group: string, startTime: number): string => {
  const out = execFileSync(
    'aws',
    ['logs', 'filter-log-events', '--log-group-name', group, '--start-time', String(startTime), '--output', 'json', '--no-paginate'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  return out
}

const main = async () => {
  const started = Date.now()
  const token = await signIn()
  check('demo user signs in', token !== '')
  if (!token) process.exit(1)

  const mock = (name: string) => readFileSync(fileURLToPath(new URL(`../../../apps/web/public/mock/${name}`, import.meta.url)))
  // The broken file goes first, so the valid ones queue up behind it.
  const broken = await upload(token, 'broken.pdf', 'broken.pdf', 'pdf', randomBytes(4096))
  const valid = [
    await upload(token, 'sample-invoice.pdf', 'sample-invoice.pdf', 'pdf', mock('sample-invoice.pdf')),
    await upload(token, 'sample-long.pdf', 'sample-long.pdf', 'pdf', mock('sample-long.pdf')),
    await upload(token, 'sample-receipt.jpg', 'sample-receipt.jpg', 'jpg', mock('sample-receipt.jpg')),
  ]
  const deadline = Date.now() + TIMEOUT_MS
  const brokenRow = await waitFinal(broken.documentId, deadline)
  check('broken.pdf ends in error with a short message', brokenRow.status === 'error' && Boolean(brokenRow.error_message), `${brokenRow.status}: ${brokenRow.error_message ?? ''}`)

  // The queue is not blocked: one more valid upload after the broken file is done.
  const after = await upload(token, 'sample-invoice.pdf (after broken)', 'sample-invoice-2.pdf', 'pdf', mock('sample-invoice.pdf'))
  const summaries: Summary[] = []
  for (const item of [...valid, after]) {
    const row = await waitFinal(item.documentId, deadline)
    const mustReview = item.label.startsWith('sample-invoice')
    summaries.push(await verify(item, row, mustReview ? 'needs_review' : 'final'))
  }
  check('a valid upload after the broken one still finishes', summaries.at(-1)?.status === 'needs_review')

  console.log('\nSummary (status, pages, tokens, fields, overall confidence):')
  for (const s of summaries) console.log(`  ${s.label}: ${s.status}, ${s.pages} pages, ${s.tokens} tokens, ${s.fields} fields, ${s.confidence}`)

  // Keep the successful documents as demo data; remove the broken one (row and object).
  await new S3Client({}).send(new DeleteObjectCommand({ Bucket: bucket, Key: broken.key }))
  await admin.from('documents').delete().eq('id', broken.documentId)
  const { count } = await admin.from('documents').select('id', { count: 'exact', head: true }).eq('id', broken.documentId)
  check('broken document row and object removed', (count ?? 0) === 0)

  // Logs of both pipeline functions for this run: cost totals, and no secrets.
  await new Promise((resolve) => setTimeout(resolve, 10000)) // CloudWatch delivery delay
  const raw = ['/aws/lambda/docspread-dev-pipeline-ocr', '/aws/lambda/docspread-dev-pipeline-extract'].map((group) => awsLogs(group, started))
  const events = raw.flatMap((text) => (JSON.parse(text) as { events: { message: string }[] }).events.map((e) => e.message)) // aws cli output shape
  const secretPatterns = ['sb_secret_', 'sk-ant-', 'eyJ', 'Bearer ']
  const leaked = secretPatterns.filter((pattern) => events.some((message) => message.includes(pattern)))
  check(`${events.length} log lines contain none of ${secretPatterns.join(', ')}`, leaked.length === 0, leaked.length ? `found: ${leaked.join(', ')}` : '')

  const calls = events.flatMap((message) => {
    const start = message.indexOf('{"event":"claude_call"')
    if (start < 0) return []
    try {
      return [JSON.parse(message.slice(start)) as { step: string; model: string; inputTokens: number; outputTokens: number; costUsd: number }] // our own log line
    } catch {
      return []
    }
  })
  check('token usage and cost logged for the run', calls.length > 0, `${calls.length} claude_call lines`)
  const byModel = new Map<string, { calls: number; input: number; output: number; cost: number }>()
  for (const call of calls) {
    const entry = byModel.get(call.model) ?? { calls: 0, input: 0, output: 0, cost: 0 }
    entry.calls += 1
    entry.input += call.inputTokens
    entry.output += call.outputTokens
    entry.cost += call.costUsd
    byModel.set(call.model, entry)
  }
  let total = 0
  for (const [model, entry] of byModel) {
    total += entry.cost
    console.log(`  ${model}: ${entry.calls} calls, ${entry.input} input / ${entry.output} output tokens, $${entry.cost.toFixed(4)}`)
  }
  console.log(`  total estimated cost: $${total.toFixed(4)}`)

  // An assumed currency must be unverified: the extract log counts them, the values must show matching low confidence.
  const assumed = events.reduce((sum, message) => {
    const match = /"event":"extract_done"[^}]*"assumedCurrencies":(\d+)/.exec(message)
    return sum + Number(match?.[1] ?? 0)
  }, 0)
  console.log(`  amounts with an assumed currency (company default): ${assumed}`)
  let lowMoney = 0
  for (const item of [...valid, after]) {
    const row = await fetchRow(item.documentId)
    lowMoney += scalarsOf(row.values).filter((s) => s.type === 'money' && isObject(s.value) && typeof s.confidence === 'number' && s.confidence < LOW_CONFIDENCE).length
  }
  check('every assumed currency stays below the low-confidence threshold', lowMoney >= assumed, `${assumed} assumed, ${lowMoney} low-confidence money values`)

  console.log(failures === 0 ? 'ALL PASS' : `${failures} check(s) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

await main()
