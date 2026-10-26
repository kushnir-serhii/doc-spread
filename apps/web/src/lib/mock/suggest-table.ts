// Fake "table from a region" (spec 015): the first line is the header, columns follow its x positions.
// Not part of the public mock API.
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import { guessFieldType } from '@/lib/fields/guess-field-type'
import { DEFAULT_CURRENCY } from '@/lib/fields/default-currency'
import { parseFieldValue } from '@/lib/fields/parse-field-value'
import { toKey } from './propose-fields'
import type {
  AnyExtractedValue,
  BBox,
  ColumnDef,
  ScalarFieldType,
  TableSuggestion,
  TableValue,
  Token,
} from './types'

const PREVIEW_ROWS = 5
/** a space between words is under this many text heights (in page-width units) */
const WORD_GAP = 0.6
/** Columns are guessed as one of these; anything else (or a mix) stays text. */
const GUESSED_TYPES: readonly ScalarFieldType[] = ['date', 'money', 'number']
const MONEY_HEADER = /price|amount|total|cost|value|sum|cena|kwota|wart|brutto|netto/i

const center = (box: BBox) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const sameLine = (a: BBox, b: BBox) => Math.abs(center(a).y - center(b).y) < Math.max(a.h, b.h) / 2
const overlapX = (a: BBox, b: BBox) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)

const inside = (token: Token, region: BBox) => {
  const c = center(token.bbox)
  return c.x >= region.x && c.x <= region.x + region.w && c.y >= region.y && c.y <= region.y + region.h
}

const byPosition = (a: Token, b: Token) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x

/** Tokens of one visual line each, top to bottom, left to right inside a line. */
const toLines = (tokens: Token[]): Token[][] => {
  const lines: Token[][] = []
  for (const token of [...tokens].sort(byPosition)) {
    const line = lines.find((l) => sameLine(l[0].bbox, token.bbox))
    if (line) line.push(token)
    else lines.push([token])
  }
  return lines.map((line) => line.sort((a, b) => a.bbox.x - b.bbox.x))
}

interface HeaderCell {
  label: string
  box: BBox
}

/** Neighbouring header words about one space apart belong to one column title. */
const toHeaderCells = (line: Token[]): HeaderCell[] => {
  const cells: HeaderCell[] = []
  for (const { text, bbox } of line) {
    const last = cells[cells.length - 1]
    if (last && bbox.x - (last.box.x + last.box.w) < bbox.h * WORD_GAP) {
      last.label = `${last.label} ${text}`
      last.box = { ...last.box, w: bbox.x + bbox.w - last.box.x }
    } else cells.push({ label: text, box: bbox })
  }
  return cells
}

const columnIndexOf = (header: HeaderCell[], token: Token): number => {
  let best = 0
  let bestScore = -Infinity
  header.forEach((cell, i) => {
    // overlap wins; otherwise the nearest centre (negative distance)
    const overlap = overlapX(cell.box, token.bbox)
    const score = overlap > 0 ? overlap : -Math.abs(center(cell.box).x - center(token.bbox).x)
    if (score > bestScore) {
      best = i
      bestScore = score
    }
  })
  return best
}

const guessColumnType = (label: string, values: string[]): ScalarFieldType => {
  const counts = new Map<ScalarFieldType, number>()
  for (const text of values) {
    const type = guessFieldType(text, 'select')
    if (type && GUESSED_TYPES.includes(type)) counts.set(type, (counts.get(type) ?? 0) + 1)
  }
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (!top) return 'text'
  // an amount without a currency reads as a number: the header says whether it is money
  return top[0] === 'number' && MONEY_HEADER.test(label) ? 'money' : top[0]
}

const blankCell = (type: ScalarFieldType): AnyExtractedValue => {
  const blank = FIELD_TYPE_META[type].empty()
  return blank.type === 'table' ? { type: 'text', value: null, confidence: 0 } : blank
}

const toCell = (type: ScalarFieldType, text: string, page: number, box: BBox): AnyExtractedValue => {
  const parsed = parseFieldValue({ type }, text)
  if (!parsed.ok) return blankCell(type)
  // an assumed part (a currency) keeps the cell below the low-confidence threshold
  return { ...parsed.value, confidence: parsed.warning ? 0.5 : 0.95, source: { page, bbox: box } }
}

const unionBox = (tokens: Token[]): BBox => {
  const x = Math.min(...tokens.map((t) => t.bbox.x))
  const y = Math.min(...tokens.map((t) => t.bbox.y))
  return {
    x,
    y,
    w: Math.max(...tokens.map((t) => t.bbox.x + t.bbox.w)) - x,
    h: Math.max(...tokens.map((t) => t.bbox.y + t.bbox.h)) - y,
  }
}

/** Throws a message the panel shows when the region holds nothing to build a table from. */
export const buildTableSuggestion = (
  documentId: string,
  page: number,
  region: BBox,
  pageTokens: Token[],
): TableSuggestion => {
  const lines = toLines(pageTokens.filter((t) => inside(t, region)))
  if (lines.length === 0) throw new Error('No text in this region. Draw the rectangle over a table.')
  const header = toHeaderCells(lines[0])
  const body = lines.slice(1)
  if (body.length === 0) throw new Error('This region has a header line but no rows. Include the rows of the table.')

  const rows = body.map((line) => {
    const cells: Token[][] = header.map(() => [])
    for (const token of line) cells[columnIndexOf(header, token)].push(token)
    return cells
  })
  const textOf = (tokens: Token[]) => tokens.map((t) => t.text).join(' ')

  const taken: string[] = []
  const columns: ColumnDef[] = header.map((cell, i) => {
    const base = toKey(cell.label) || `column_${i + 1}`
    let key = base
    for (let n = 2; taken.includes(key); n += 1) key = `${base}_${n}`
    taken.push(key)
    const values = rows.map((r) => textOf(r[i])).filter((v) => v !== '')
    return {
      id: crypto.randomUUID(),
      key,
      label: cell.label,
      type: guessColumnType(cell.label, values),
      required: false,
      examples: [],
    }
  })

  const preview: TableValue = {
    type: 'table',
    rows: rows.slice(0, PREVIEW_ROWS).map((r) => ({
      id: crypto.randomUUID(),
      cells: Object.fromEntries(
        columns.map((column, i) => [
          column.id,
          r[i].length > 0
            ? toCell(column.type, textOf(r[i]), page, unionBox(r[i]))
            : blankCell(column.type),
        ]),
      ),
    })),
  }

  const assumed = columns.filter((column, i) =>
    column.type === 'money' &&
    rows.some((r) => {
      const parsed = parseFieldValue({ type: 'money' }, textOf(r[i]))
      return parsed.ok && parsed.warning !== undefined
    }),
  )
  const warning =
    assumed.length > 0
      ? `No currency in the ${assumed.length === 1 ? 'column' : 'columns'} ${assumed.map((c) => c.label).join(', ')}, so ${DEFAULT_CURRENCY} was assumed. Check it after adding the table.`
      : undefined

  const all = lines.flat()
  return {
    label: 'Table',
    columns,
    preview,
    ...(warning ? { warning } : {}),
    example: { documentId, page, bbox: region, text: textOf(all) },
  }
}
