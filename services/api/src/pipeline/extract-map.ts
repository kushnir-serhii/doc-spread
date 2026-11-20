import type { ColumnDef, ExtractedScalar, FieldDef, ScalarFieldType, StoredMoney, StoredValue } from './field-types.js'
import { unionBox, type Token } from './page-types.js'

/**
 * Confidence given to an amount whose currency was assumed (the company's default) instead of read.
 * It must stay below LOW_CONFIDENCE (0.9, apps/web/src/lib/fields/confidence.ts) so the value shows as unverified;
 * 0.5 is the web app's own ASSUMED_CONFIDENCE (features/documents/review/use-review-pointing.ts).
 */
export const ASSUMED_CURRENCY_CONFIDENCE = 0.5
/** Used only when the company has no default currency (no country defaults: USD, as in the web app's DEFAULT_CURRENCY). */
export const FALLBACK_CURRENCY = 'USD'

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const clampConfidence = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : 0)

const knownCurrencies = new Set(Intl.supportedValuesOf('currency'))
const minorDigits = (currency: string): number =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2

/** "1234.50" in USD -> 123450 (integer minor units), by string math so no float rounding creeps in; null if not a plain decimal. */
export const toMinorUnits = (decimal: string, currency: string): number | null => {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(decimal.trim())
  if (!match) return null
  const digits = minorDigits(currency)
  const fraction = match[3] ?? ''
  let minor = BigInt(`${match[2]}${fraction.padEnd(digits, '0').slice(0, digits)}`)
  if (fraction.length > digits && Number(fraction[digits]) >= 5) minor += 1n
  const result = Number(match[1] === '-' ? -minor : minor)
  return Number.isSafeInteger(result) ? result : null
}

export interface MapContext {
  tokens: Map<string, { page: number; token: Token }>
  companyCurrency: string
  stats: { assumedCurrencies: number }
}

const parseCell = (raw: unknown): { value: unknown; confidence: number; tokenIds: string[] } => {
  if (!isObject(raw) || raw.found !== true) return { value: null, confidence: isObject(raw) ? clampConfidence(raw.confidence) : 0, tokenIds: [] }
  const confidence = clampConfidence(raw.confidence)
  const tokenIds = typeof raw.tokenIds === 'string' ? raw.tokenIds.split(/[\s,;|]+/).filter((id) => id !== '') : []
  return { value: raw.value, confidence, tokenIds }
}

/** The page and union box of the cited tokens that sit on the first cited page. Unknown ids are ignored. */
const sourceOf = (tokenIds: string[], context: MapContext): ExtractedScalar['source'] => {
  const found = tokenIds.flatMap((id) => context.tokens.get(id) ?? [])
  const first = found[0]
  if (!first) return undefined
  const bbox = unionBox(found.filter((entry) => entry.page === first.page).map((entry) => entry.token.bbox))
  return bbox ? { page: first.page, bbox } : undefined
}

const moneyOf = (raw: unknown, confidence: number, context: MapContext): { value: StoredMoney | null; confidence: number } => {
  if (!isObject(raw) || typeof raw.amount !== 'string') return { value: null, confidence }
  const read = typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : ''
  const fromDocument = raw.currencyFromDocument === true && knownCurrencies.has(read)
  // A currency the model did not read from the document is never silently filled in: the company default is used
  // and the amount's confidence is capped below the low-confidence threshold, so it stays flagged until a person confirms it.
  const currency = fromDocument ? read : context.companyCurrency
  const amount = toMinorUnits(raw.amount, currency)
  if (amount === null) return { value: null, confidence: Math.min(confidence, ASSUMED_CURRENCY_CONFIDENCE) }
  if (fromDocument) return { value: { amount, currency }, confidence }
  context.stats.assumedCurrencies += 1
  return { value: { amount, currency }, confidence: Math.min(confidence, ASSUMED_CURRENCY_CONFIDENCE) }
}

const mapScalar = (
  def: { type: ScalarFieldType; options?: string[] },
  raw: unknown,
  context: MapContext,
): ExtractedScalar => {
  const cell = parseCell(raw)
  const source = sourceOf(cell.tokenIds, context)
  const withSource = source ? { source } : {}
  if (def.type === 'money') {
    const money = moneyOf(cell.value, cell.confidence, context)
    return { type: 'money', value: money.value, confidence: money.confidence, ...withSource }
  }
  let value: ExtractedScalar['value'] = null
  const raw1 = cell.value
  switch (def.type) {
    case 'number':
      value = typeof raw1 === 'number' && Number.isFinite(raw1) ? raw1 : null
      break
    case 'boolean':
      value = typeof raw1 === 'boolean' ? raw1 : null
      break
    case 'date':
      value = typeof raw1 === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw1) ? raw1 : null
      break
    case 'select':
      value = typeof raw1 === 'string' && (def.options ?? []).includes(raw1) ? raw1 : null
      break
    default:
      value = typeof raw1 === 'string' && raw1.trim() !== '' ? raw1.trim() : null
  }
  return { type: def.type, value, confidence: cell.confidence, ...withSource }
}

export interface MappedValues {
  values: Record<string, StoredValue>
  /** Mean of the field confidences (a table counts as the mean of its cells). */
  overallConfidence: number
}

const mean = (numbers: number[]): number => (numbers.length === 0 ? 0 : numbers.reduce((sum, n) => sum + n, 0) / numbers.length)

/** Maps the model's JSON (keyed by field key) to values keyed by field id, in the shape of FieldValue. */
export const mapExtraction = (fields: FieldDef[], raw: unknown, context: MapContext): MappedValues => {
  const answers = isObject(raw) ? raw : {}
  const values: Record<string, StoredValue> = {}
  const confidences: number[] = []
  for (const field of fields) {
    const answer = answers[field.key]
    if (field.type !== 'table') {
      const value = mapScalar(field, answer, context)
      values[field.id] = value
      confidences.push(value.confidence)
      continue
    }
    const rawRows = isObject(answer) && Array.isArray(answer.rows) ? answer.rows : []
    const rows = rawRows.map((rawRow, index) => {
      const cells: Record<string, ExtractedScalar> = {}
      const rawCells = isObject(rawRow) && isObject(rawRow.cells) ? rawRow.cells : {}
      for (const column of field.columns satisfies ColumnDef[]) cells[column.id] = mapScalar(column, rawCells[column.key], context)
      return { id: `r${index + 1}`, cells }
    })
    values[field.id] = { type: 'table', rows }
    const cellConfidences = rows.flatMap((row) => Object.values(row.cells).map((cell) => cell.confidence))
    if (cellConfidences.length > 0) confidences.push(mean(cellConfidences))
  }
  return { values, overallConfidence: Math.round(clamp01(mean(confidences)) * 1e4) / 1e4 }
}
