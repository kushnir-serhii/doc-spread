// Page sources for the mock documents, for getDocumentPages (slice 3).
// Three documents are backed by the sample files and have hand-made OCR tokens to fetch.
// Every other document gets deterministic synthetic pages: no image, a few tokens laid out from its values.
import { seedDocuments } from './data'
import { seedDocumentTypeVersions } from './document-types-seed'
import { SAMPLE_JPG_TOKENS_URL, SAMPLE_LONG_TOKENS_URL, SAMPLE_PDF_TOKENS_URL } from './documents-seed'
import type { AnyExtractedValue, Document, DocumentPage, DocumentType, Token } from './types'

export type PageSource =
  | { kind: 'file'; tokensUrl: string }
  | { kind: 'synthetic'; pages: DocumentPage[] }

/** Documents whose file is one of the samples in public/mock/ and whose tokens line up with it. */
const FILE_TOKENS: Record<string, string> = {
  'doc-001': SAMPLE_PDF_TOKENS_URL,
  'doc-002': SAMPLE_JPG_TOKENS_URL,
  'doc-028': SAMPLE_LONG_TOKENS_URL,
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_X = 0.08
const MARGIN_Y = 0.08
const CHAR_WIDTH = 0.0105
const WORD_GAP = 0.012
const LINE_HEIGHT = 0.028
const TOKEN_HEIGHT = 0.016
const MAX_TABLE_ROWS = 5

const valueText = (value: AnyExtractedValue): string | null => {
  if (value.value === null) return null
  if (value.type === 'money') return `${(value.value.amount / 100).toFixed(2)} ${value.value.currency}`
  if (value.type === 'boolean') return value.value ? 'yes' : 'no'
  return String(value.value)
}

const valueLines = (doc: Document, type: DocumentType): string[] => {
  const lines: string[] = []
  for (const field of type.fields) {
    const value = doc.values[field.id]
    if (!value) continue
    if (value.type === 'table') {
      lines.push(`${field.label}:`)
      for (const row of value.rows.slice(0, MAX_TABLE_ROWS)) {
        const cells = (field.columns ?? []).map((c) => row.cells[c.id]).filter((cell) => cell !== undefined)
        lines.push(cells.map(valueText).filter((t) => t !== null).join(' '))
      }
    } else {
      const text = valueText(value)
      if (text !== null) lines.push(`${field.label}: ${text}`)
    }
  }
  return lines
}

/** Lays words out left to right, wrapping at the margin; lines that don't fit the page are dropped. */
const layoutTokens = (docId: string, pageIndex: number, lines: string[]): Token[] => {
  const tokens: Token[] = []
  let y = MARGIN_Y
  for (const line of lines) {
    let x = MARGIN_X
    for (const word of line.split(/\s+/).filter(Boolean)) {
      const w = word.length * CHAR_WIDTH
      if (x + w > 1 - MARGIN_X && x > MARGIN_X) {
        x = MARGIN_X
        y += LINE_HEIGHT
      }
      if (y + TOKEN_HEIGHT > 1 - MARGIN_Y) return tokens
      tokens.push({
        id: `${docId}-p${pageIndex}-t${tokens.length}`,
        text: word,
        bbox: { x, y, w: Math.min(w, 1 - MARGIN_X - x), h: TOKEN_HEIGHT },
      })
      x += w + WORD_GAP
    }
    y += LINE_HEIGHT
  }
  return tokens
}

const syntheticPages = (doc: Document): DocumentPage[] => {
  const type = seedDocumentTypeVersions.find((t) => t.id === doc.typeId && t.version === doc.typeVersion)
  // not read yet (uploaded, processing) or unreadable (error): no OCR tokens
  const ocrDone = doc.status !== 'uploaded' && doc.status !== 'processing' && doc.status !== 'error'
  return Array.from({ length: doc.file.pageCount }, (_, index) => {
    let lines: string[] = []
    if (ocrDone && index === 0) {
      lines = type
        ? [type.name.toUpperCase(), ...valueLines(doc, type)]
        : ['DOCUMENT', ...doc.file.name.split(/[_.\-\s]+/)]
    } else if (ocrDone) {
      lines = [`Page ${index + 1} of ${doc.file.pageCount}`]
    }
    return {
      index,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      tokens: layoutTokens(doc.id, index, lines),
    }
  })
}

/** One entry per document id. */
export const seedDocumentPages: Record<string, PageSource> = Object.fromEntries(
  seedDocuments.map((doc): [string, PageSource] => {
    const tokensUrl = FILE_TOKENS[doc.id]
    return [doc.id, tokensUrl ? { kind: 'file', tokensUrl } : { kind: 'synthetic', pages: syntheticPages(doc) }]
  }),
)
