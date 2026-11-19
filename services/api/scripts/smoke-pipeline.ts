// Smoke test of the pipeline on Vercel + Supabase (spec 022, slice 5). Prints PASS/FAIL lines and a summary,
// never document values or text, tokens or keys.
//
//   pnpm smoke-pipeline                      -> production: uploads through the real API (SMOKE_API_URL, default
//                                               https://doc-spread.vercel.app/api); pg_cron triggers the functions
//                                               (up to 30 s per step) and the script polls the documents rows.
//   SMOKE_MODE=direct pnpm smoke-pipeline    -> everything in-process against the project in services/api/.env.local:
//                                               the router and both pipeline handlers are called with a Request that
//                                               carries PIPELINE_SECRET (a throwaway one if the file has none).
//                                               This spends real Claude money and drains that project's queues.
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { API_ENV_FILE, WEB_ENV_FILE, readEnvFile, requireValue } from './env-file.ts'

/** apps/web LOW_CONFIDENCE (src/lib/fields/confidence.ts): below this a value counts as unverified. */
const LOW_CONFIDENCE = 0.9
const POLL_MS = 5000
const TIMEOUT_MS = 6 * 60 * 1000
const FINAL = new Set(['needs_review', 'unclassified', 'error'])
const SENTINEL_ID = '00000000-0000-4000-8000-000000000000'

const apiEnv = readEnvFile(API_ENV_FILE)
const webEnv = readEnvFile(WEB_ENV_FILE)
const setting = (name: string): string => process.env[name] || requireValue(apiEnv, name, 'services/api/.env.local')
const supabaseUrl = setting('SUPABASE_URL')
const secretKey = setting('SUPABASE_SECRET_KEY')
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || requireValue(webEnv, 'VITE_SUPABASE_PUBLISHABLE_KEY', 'apps/web/.env.local')
const bucket = process.env.STORAGE_DOCUMENTS_BUCKET || apiEnv.STORAGE_DOCUMENTS_BUCKET || 'documents'
const directMode = process.env.SMOKE_MODE === 'direct'
const apiUrl = (process.env.SMOKE_API_URL || 'https://doc-spread.vercel.app/api').replace(/\/$/, '')
const pipelineSecret = process.env.PIPELINE_SECRET || apiEnv.PIPELINE_SECRET || randomBytes(24).toString('hex')

const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

type Handle = (request: Request) => Promise<Response>
let router: Handle | undefined
let ocrHandler: Handle | undefined
let extractHandler: Handle | undefined
/** Log lines of the in-process functions (direct mode), to total the Claude usage. */
const captured: string[] = []
if (directMode) {
  process.env.SUPABASE_URL = supabaseUrl
  process.env.SUPABASE_SECRET_KEY = secretKey
  process.env.SUPABASE_JWKS_URL ||= apiEnv.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`
  process.env.STORAGE_DOCUMENTS_BUCKET = bucket
  process.env.UPLOAD_MAX_BYTES ||= apiEnv.UPLOAD_MAX_BYTES || '20971520'
  process.env.PIPELINE_SECRET = pipelineSecret
  for (const name of ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL_CLASSIFY', 'ANTHROPIC_MODEL_EXTRACT', 'CLASSIFY_MIN_CONFIDENCE']) {
    process.env[name] ||= requireValue(apiEnv, name, 'services/api/.env.local')
  }
  const originalLog = console.log
  console.log = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '))
    originalLog(...args)
  }
  router = (await import('../src/handler.js')).handle
  ocrHandler = (await import('../src/pipeline/ocr-handler.js')).handleOcr
  extractHandler = (await import('../src/pipeline/extract-handler.js')).handleExtract
}
console.log(directMode ? 'mode: direct (router and pipeline handlers called in-process)' : `mode: production API ${apiUrl}`)

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures += 1
}
const skip = (label: string, reason: string) => console.log(`SKIP ${label} (${reason})`)

const apiCall = async (path: string, init: { token: string; body?: unknown }): Promise<Response> => {
  const requestInit = {
    method: 'POST',
    headers: { authorization: `Bearer ${init.token}`, ...(init.body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  }
  return router ? router(new Request(`http://localhost/api${path}`, requestInit)) : fetch(`${apiUrl}${path}`, requestInit)
}

const signIn = async (): Promise<string> => {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email: setting('DEMO_USER_EMAIL'), password: setting('DEMO_USER_PASSWORD') }),
  })
  const json: unknown = await response.json()
  return typeof json === 'object' && json !== null && 'access_token' in json ? String(json.access_token) : ''
}

interface Upload {
  label: string
  documentId: string
  path: string
  startedAt: number
}

const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' } as const
type Kind = keyof typeof MIME

/** The real flow: POST /uploads, bytes to the signed URL (as the browser does), POST /uploads/:id/complete. */
const upload = async (token: string, label: string, fileName: string, kind: Kind, bytes: Buffer): Promise<Upload> => {
  const startedAt = Date.now()
  const created = await apiCall('/uploads', { token, body: { fileName, fileType: kind, size: bytes.length, contentType: MIME[kind] } })
  const body = (await created.json()) as { documentId?: string; upload?: { token?: string; path?: string } } // our API's response shape
  if (!created.ok || !body.documentId || !body.upload?.token || !body.upload.path) throw new Error(`${label}: POST /uploads returned ${created.status}`)
  const browser = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const written = await browser.storage.from(bucket).uploadToSignedUrl(body.upload.path, body.upload.token, bytes, { contentType: MIME[kind] })
  if (written.error) throw new Error(`${label}: storage upload failed: ${written.error.message}`)
  const completed = await apiCall(`/uploads/${body.documentId}/complete`, { token })
  if (completed.status !== 202) throw new Error(`${label}: complete returned ${completed.status}`)
  return { label, documentId: body.documentId, path: body.upload.path, startedAt }
}

/** Direct mode only: stands in for pg_cron, one tick for each queue. */
const pump = async (): Promise<void> => {
  const headers = { 'x-pipeline-secret': pipelineSecret }
  for (const handler of [ocrHandler, extractHandler]) {
    await handler?.(new Request('http://localhost/api/pipeline', { method: 'POST', headers, body: '{}' }))
  }
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

/** Polls until the document leaves uploaded/processing, or the time is up (about 6 minutes). */
const waitFinal = async (id: string): Promise<DocRow> => {
  const deadline = Date.now() + TIMEOUT_MS
  for (;;) {
    if (directMode) await pump()
    const row = await fetchRow(id)
    if (FINAL.has(row.status) || Date.now() > deadline) return row
    if (!directMode) await new Promise((resolve) => setTimeout(resolve, POLL_MS))
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
  seconds: number
}

const verify = async (item: Upload, row: DocRow, expect: 'needs_review' | 'final'): Promise<Summary> => {
  const seconds = Math.round((Date.now() - item.startedAt) / 1000)
  const { data: pages } = await admin.from('document_pages').select('page_index, width, height, tokens').eq('document_id', item.documentId)
  const pageRows = pages ?? []
  const tokens = pageRows.flatMap((page) => (Array.isArray(page.tokens) ? (page.tokens as { bbox: { x: number; y: number; w: number; h: number } }[]) : [])) // our OCR output
  const inRange = (n: number) => n >= 0 && n <= 1
  const boxesOk = tokens.every(({ bbox }) => inRange(bbox.x) && inRange(bbox.y) && inRange(bbox.x + bbox.w + 1e-6) && inRange(bbox.y + bbox.h + 1e-6) && bbox.w >= 0 && bbox.h >= 0)
  const scalars = scalarsOf(row.values)
  const fieldCount = Object.keys(row.values).length

  check(`${item.label}: reached a final status`, FINAL.has(row.status), `${row.status} after ${seconds} s`)
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
  return { label: item.label, status: row.status, pages: pageRows.length, tokens: tokens.length, fields: fieldCount, confidence: Number(row.overall_confidence), seconds }
}

/** 401 without or with a wrong secret, and the queue untouched. Run while the queue is idle. */
const unauthorizedChecks = async (): Promise<void> => {
  // A sentinel message (no such document) on `ocr`: when nobody has read it, our own read sees read_ct 1.
  const { error: sendError } = await admin.rpc('queue_send', { queue_name: 'ocr', message: { documentId: SENTINEL_ID } })
  if (sendError) {
    skip('unauthorized calls leave the ocr queue alone', `queue_send failed: ${sendError.message}`)
    return
  }
  const url = directMode ? 'http://localhost/api/pipeline/ocr' : `${new URL(apiUrl).origin}/api/pipeline/ocr`
  const post = (headers: Record<string, string>): Promise<Response> =>
    ocrHandler ? ocrHandler(new Request(url, { method: 'POST', headers, body: '{}' })) : fetch(url, { method: 'POST', headers, body: '{}' })
  const missing = await post({})
  check('POST /api/pipeline/ocr without the secret returns 401', missing.status === 401, `status ${missing.status}`)
  const wrong = await post({ 'x-pipeline-secret': randomBytes(16).toString('hex') })
  check('POST /api/pipeline/ocr with a wrong secret returns 401', wrong.status === 401, `status ${wrong.status}`)
  const { data } = await admin.rpc('queue_read', { queue_name: 'ocr', visibility_timeout: 30, quantity: 5 })
  const rows = (Array.isArray(data) ? data : []) as { msg_id: number; read_ct: number; message: { documentId?: string } }[] // queue_read's row shape
  const mine = rows.find((row) => row.message?.documentId === SENTINEL_ID)
  if (mine) {
    check('the ocr queue was not read by the unauthorized calls (sentinel read_ct is 1)', mine.read_ct === 1, `read_ct ${mine.read_ct}`)
    await admin.rpc('queue_archive', { queue_name: 'ocr', message_id: mine.msg_id })
  } else {
    skip('the ocr queue was not read by the unauthorized calls', 'a cron tick consumed the sentinel first; the 401 checks above still stand')
  }
}

interface Call {
  step: string
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/** Prints token usage and cost per model from claude_call log lines. */
const reportUsage = (lines: readonly string[]): void => {
  const calls = lines.flatMap((line) => {
    const start = line.indexOf('{"event":"claude_call"')
    if (start < 0) return []
    try {
      return [JSON.parse(line.slice(start)) as Call] // our own log line
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
}

const main = async () => {
  const token = await signIn()
  check('demo user signs in', token !== '')
  if (!token) process.exit(1)

  await unauthorizedChecks()

  const mock = (name: string) => readFileSync(fileURLToPath(new URL(`../../../apps/web/public/mock/${name}`, import.meta.url)))
  // The broken file goes first, so the valid ones queue up behind it.
  const broken = await upload(token, 'broken.pdf', 'broken.pdf', 'pdf', randomBytes(4096))
  const valid = [
    await upload(token, 'sample-invoice.pdf', 'sample-invoice.pdf', 'pdf', mock('sample-invoice.pdf')),
    await upload(token, 'sample-long.pdf', 'sample-long.pdf', 'pdf', mock('sample-long.pdf')),
    await upload(token, 'sample-receipt.jpg', 'sample-receipt.jpg', 'jpg', mock('sample-receipt.jpg')),
  ]
  const brokenRow = await waitFinal(broken.documentId)
  check('broken.pdf ends in error with a short message', brokenRow.status === 'error' && Boolean(brokenRow.error_message), `${brokenRow.status}: ${brokenRow.error_message ?? ''}`)

  // The queue is not blocked: one more valid upload after the broken file is done.
  const after = await upload(token, 'sample-invoice.pdf (after broken)', 'sample-invoice-2.pdf', 'pdf', mock('sample-invoice.pdf'))
  const summaries: Summary[] = []
  for (const item of [...valid, after]) {
    const row = await waitFinal(item.documentId)
    const mustReview = item.label.startsWith('sample-invoice') || item.label.startsWith('sample-receipt')
    summaries.push(await verify(item, row, mustReview ? 'needs_review' : 'final'))
  }
  check('a valid upload after the broken one still finishes', summaries.at(-1)?.status === 'needs_review')

  console.log('\nSummary (status, seconds from upload, pages, tokens, fields, overall confidence):')
  for (const s of summaries) console.log(`  ${s.label}: ${s.status}, ${s.seconds} s, ${s.pages} pages, ${s.tokens} tokens, ${s.fields} fields, ${s.confidence}`)

  // Keep the successful documents as demo data; remove the broken one (row and object).
  await admin.storage.from(bucket).remove([broken.path])
  await admin.from('documents').delete().eq('id', broken.documentId)
  const { count } = await admin.from('documents').select('id', { count: 'exact', head: true }).eq('id', broken.documentId)
  check('broken document row removed', (count ?? 0) === 0)

  if (directMode) {
    reportUsage(captured)
    const assumed = captured.reduce((sum, line) => sum + Number(/"event":"extract_done"[^}]*"assumedCurrencies":(\d+)/.exec(line)?.[1] ?? 0), 0)
    console.log(`  amounts with an assumed currency (company default): ${assumed}`)
    let lowMoney = 0
    for (const item of [...valid, after]) {
      const row = await fetchRow(item.documentId)
      lowMoney += scalarsOf(row.values).filter((s) => s.type === 'money' && isObject(s.value) && typeof s.confidence === 'number' && s.confidence < LOW_CONFIDENCE).length
    }
    check('every assumed currency stays below the low-confidence threshold', lowMoney >= assumed, `${assumed} assumed, ${lowMoney} low-confidence money values`)
  } else {
    // The functions run on Vercel: their logs are there, not here.
    skip('token usage, cost and secret-scan of the logs', 'read them in Vercel: `vercel logs <deployment-url> | pnpm scan-logs`, and look for {"event":"claude_call"} lines in the dashboard')
  }

  console.log(failures === 0 ? 'ALL PASS' : `${failures} check(s) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

await main()
