// Runs one local file through the pipeline's own OCR -> classify -> extract code, in-process: no database, Storage or queue
// (spec 026). Prints exactly one JSON object on stdout; everything else (including the pipeline's `claude_call` log
// lines) goes to stderr.
//
//   pnpm --filter @docspread/api eval-extract --file apps/web/public/mock/sample-invoice.pdf \
//     --types evals/types/invoice.json,evals/types/receipt.json [--classify-model <id>] [--extract-model <id>] \
//     [--min-confidence <n>] [--currency <code>]
//
// Paths: pnpm runs this script with cwd services/api, so a relative path is tried against the current directory first
// and then against the repo root (the second is what the examples above use). The key of a type is the file's basename
// (`invoice.json` -> `invoice`); it is also the type id offered to the classifier.
// Settings: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL_CLASSIFY, ANTHROPIC_MODEL_EXTRACT, CLASSIFY_MIN_CONFIDENCE come from
// the environment, then services/api/.env.local (may be absent), then built-in defaults. Flags override all of these.
// Exit code 1 only when it cannot run at all (bad arguments, unreadable file, missing key); a pipeline error is a result.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { basename, extname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { API_ENV_FILE, readEnvFile } from './env-file.ts'
import { createClaudeClient } from '../src/pipeline/claude.js'
import { classifyAndExtract, type CallRecord, type TypeChoice } from '../src/pipeline/extract-core.js'
import { FALLBACK_CURRENCY } from '../src/pipeline/extract-map.js'
import { buildExtractionSchema, CLASSIFY_SYSTEM, EXTRACT_SYSTEM, planExtractionCalls } from '../src/pipeline/extract-schema.js'
import { parseFieldDefs, type FieldDef, type StoredValue } from '../src/pipeline/field-types.js'
import { readPages } from '../src/pipeline/ocr-handler.js'
import { PermanentError } from '../src/pipeline/queue.js'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const FLAGS = ['file', 'types', 'classify-model', 'extract-model', 'min-confidence', 'currency']

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

const parseArgs = (argv: string[]): Record<string, string> => {
  const values: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]?.replace(/^--/, '')
    const value = argv[i + 1]
    if (!flag || !argv[i]?.startsWith('--') || !FLAGS.includes(flag) || value === undefined) return fail(`Bad arguments near "${argv[i] ?? ''}". Flags: ${FLAGS.map((f) => `--${f}`).join(' ')}`)
    values[flag] = value
  }
  return values
}

const resolvePath = (path: string): string => {
  if (isAbsolute(path)) return path
  const here = resolve(process.cwd(), path)
  return existsSync(here) ? here : resolve(REPO_ROOT, path)
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const loadType = (path: string): TypeChoice & { fieldDefs: FieldDef[] } => {
  const file = resolvePath(path)
  if (!existsSync(file)) return fail(`Type file not found: ${path}`)
  const json: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (!isObject(json)) return fail(`Type file is not a JSON object: ${path}`)
  const key = basename(file, extname(file))
  const name = typeof json.name === 'string' && json.name !== '' ? json.name : key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const description = typeof json.description === 'string' ? json.description : ''
  const fieldDefs = parseFieldDefs(json.fields)
  return { id: key, name, description, version: 1, fields: json.fields, fieldDefs }
}

const fileKindOf = (path: string): 'pdf' | 'png' | 'jpg' => {
  const ext = extname(path).toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (ext === '.png') return 'png'
  if (ext === '.jpg' || ext === '.jpeg') return 'jpg'
  return fail(`Unsupported file type "${ext}" (use .pdf, .png, .jpg or .jpeg)`)
}

/** Re-keys the pipeline's id-keyed values by field key (and table cells by column key). */
const rekey = (fields: FieldDef[], values: Record<string, StoredValue>): Record<string, StoredValue> => {
  const out: Record<string, StoredValue> = {}
  for (const field of fields) {
    const value = values[field.id]
    if (!value) continue
    if (field.type !== 'table' || value.type !== 'table') {
      out[field.key] = value
      continue
    }
    out[field.key] = {
      type: 'table',
      rows: value.rows.map((row) => ({
        id: row.id,
        cells: Object.fromEntries(
          field.columns.flatMap((column) => {
            const cell = row.cells[column.id]
            return cell ? [[column.key, cell] as const] : []
          }),
        ),
      })),
    }
  }
  return out
}

const sum = (calls: CallRecord[], step: CallRecord['step']): number => calls.filter((call) => call.step === step).reduce((total, call) => total + call.ms, 0)

const args = parseArgs(process.argv.slice(2))
if (!args.file) fail('Missing --file <path>')
if (!args.types) fail('Missing --types <comma-separated JSON paths>')

const envFile = existsSync(API_ENV_FILE) ? readEnvFile(API_ENV_FILE) : {}
const setting = (name: string): string | undefined => process.env[name] || envFile[name] || undefined
const apiKey = setting('ANTHROPIC_API_KEY')
if (!apiKey) fail('ANTHROPIC_API_KEY is missing: set it in the environment or in services/api/.env.local')

const minConfidence = Number(args['min-confidence'] ?? setting('CLASSIFY_MIN_CONFIDENCE') ?? 0.7)
if (!Number.isFinite(minConfidence)) fail('--min-confidence / CLASSIFY_MIN_CONFIDENCE must be a number')
const models = {
  classify: args['classify-model'] ?? setting('ANTHROPIC_MODEL_CLASSIFY') ?? 'claude-haiku-5-5',
  extract: args['extract-model'] ?? setting('ANTHROPIC_MODEL_EXTRACT') ?? 'claude-opus-5-5',
}
const companyCurrency = args.currency ?? FALLBACK_CURRENCY

const filePath = resolvePath(args.file ?? '')
if (!existsSync(filePath)) fail(`File not found: ${args.file}`)
const fileKind = fileKindOf(filePath)
const bytes = readFileSync(filePath)
const loaded = (args.types ?? '').split(',').map((path) => loadType(path.trim()))
const types: TypeChoice[] = loaded.map(({ fieldDefs: _fieldDefs, ...type }) => type)

const promptHash = createHash('sha256')
  .update(CLASSIFY_SYSTEM)
  .update(EXTRACT_SYSTEM)
  .update(JSON.stringify(loaded.map((type) => planExtractionCalls(type.fieldDefs).map((chunk) => buildExtractionSchema(chunk)))))
  .digest('hex')

// The pipeline logs to console.log; stdout must carry only the result.
console.log = (...parts: unknown[]) => console.error(...parts)

const started = Date.now()
const calls: CallRecord[] = []
let ocrMs = 0
let outcome: 'needs_review' | 'unclassified' | 'refused' | 'error' = 'error'
let error: string | null = null
let classification: { typeKey: string | null; pickedTypeKey: string | null; confidence: number | null; model: string } | null = null
let values: Record<string, StoredValue> = {}
let overallConfidence: number | null = null

try {
  const ocrStarted = Date.now()
  const pages = await readPages(fileKind, bytes)
  ocrMs = Date.now() - ocrStarted
  const { result } = await classifyAndExtract({
    documentId: basename(filePath),
    pages,
    types,
    claude: createClaudeClient(apiKey ?? ''),
    models,
    minConfidence,
    companyCurrency: () => Promise.resolve(companyCurrency),
    file: () => Promise.resolve({ kind: fileKind, base64: bytes.toString('base64') }),
    calls,
  })
  outcome = result.outcome
  if (result.outcome === 'needs_review') {
    const fields = loaded.find((type) => type.id === result.type.id)?.fieldDefs ?? []
    values = rekey(fields, result.values)
    overallConfidence = result.overallConfidence
  }
  const classifyCall = calls.find((call) => call.step === 'classify')
  if (classifyCall) {
    // An unclassified result has a classify call but no usable type: typeKey is null; pickedTypeKey is what the classifier named.
    const typeKey = result.outcome === 'unclassified' ? null : result.type.id
    classification = {
      typeKey,
      pickedTypeKey: result.outcome === 'unclassified' ? result.pickedTypeId : typeKey,
      confidence: result.classificationConfidence,
      model: classifyCall.model,
    }
  }
  if (result.outcome === 'refused') error = 'refused'
} catch (failure) {
  outcome = 'error'
  error = failure instanceof PermanentError ? failure.message : failure instanceof Error ? `${failure.name}: ${failure.message}`.slice(0, 200) : 'unknown error'
}

const classifyMs = sum(calls, 'classify')
const extractMs = sum(calls, 'extract')
process.stdout.write(
  `${JSON.stringify({
    file: basename(filePath),
    outcome,
    error,
    classification,
    values,
    overallConfidence,
    calls,
    ms: { ocr: ocrMs, classify: classifyMs, extract: extractMs, total: Date.now() - started },
    promptHash,
  })}\n`,
  // The OCR engine can keep worker threads alive for images, so leave explicitly once stdout is flushed.
  () => process.exit(0),
)
