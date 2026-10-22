// Fake "propose fields from a sample" (spec 015): label-like tokens ("Label:") become fields.
// Not part of the public mock API.
import type { BBox, DocumentPage, FieldDef, FieldExample, Token } from './types'

const MAX_PROPOSALS = 10
const MAX_LABEL_WORDS = 4
const ISO_OR_DOTTED_DATE = /^(\d{4}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4})$/
const MONEY = /^\d[\d\s]*[.,]\d{2}$/

const FALLBACK_FIELDS: { key: string; label: string; type: FieldDef['type']; hint: string }[] = [
  { key: 'title', label: 'Title', type: 'text', hint: 'The main title or subject of the document.' },
  { key: 'date', label: 'Date', type: 'date', hint: 'The date the document was issued.' },
  { key: 'total', label: 'Total', type: 'money', hint: 'The total amount stated on the document.' },
]

const newId = () => `field-${crypto.randomUUID().slice(0, 8)}`

const toKey = (label: string): string =>
  label
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const sameLine = (a: BBox, b: BBox) => Math.abs(a.y - b.y) < Math.max(a.h, b.h) / 2

const guessType = (text: string): FieldDef['type'] => {
  if (ISO_OR_DOTTED_DATE.test(text)) return 'date'
  if (MONEY.test(text)) return 'money'
  return 'text'
}

/** Words of the label: the colon token plus the tokens just before it on the same line. */
const labelWords = (tokens: Token[], colonIndex: number): string[] => {
  const words = [tokens[colonIndex].text.replace(/:$/, '')]
  for (let i = colonIndex - 1; i >= 0 && words.length < MAX_LABEL_WORDS; i--) {
    const token = tokens[i]
    if (!sameLine(token.bbox, tokens[colonIndex].bbox) || token.text.endsWith(':')) break
    words.unshift(token.text)
  }
  return words
}

export const proposeFieldsFromPages = (documentId: string, pages: readonly DocumentPage[]): FieldDef[] => {
  const proposals: FieldDef[] = []
  const keys = new Set<string>()
  for (const page of pages) {
    page.tokens.forEach((token, i) => {
      const next = page.tokens[i + 1]
      if (proposals.length >= MAX_PROPOSALS || !token.text.endsWith(':') || !next) return
      if (!sameLine(token.bbox, next.bbox)) return
      const label = labelWords(page.tokens, i).join(' ')
      const base = toKey(label)
      if (base === '' || keys.has(base)) return
      keys.add(base)
      const example: FieldExample = {
        documentId,
        page: page.index,
        bbox: next.bbox,
        text: next.text,
        anchorText: `${label}:`,
      }
      proposals.push({
        id: newId(),
        key: base,
        label,
        type: guessType(next.text),
        required: false,
        hint: `The value written next to the label "${label}:".`,
        examples: [example],
      })
    })
  }
  if (proposals.length > 0) return proposals
  return FALLBACK_FIELDS.map((f) => ({ ...f, id: newId(), required: false, examples: [] }))
}
