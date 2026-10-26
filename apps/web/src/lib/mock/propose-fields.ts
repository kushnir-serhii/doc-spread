// Fake "propose fields from a sample" (spec 015): label-like tokens ("Label:") become fields.
// Not part of the public mock API.
import type { BBox, DocumentPage, FieldDef, FieldExample, ScalarFieldType, Token } from './types'

const MAX_PROPOSALS = 10
const MAX_LABEL_WORDS = 4
const ISO_OR_DOTTED_DATE = /^(\d{4}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4})$/
const MONEY = /^\d[\d\s]*[.,]\d{2}$/
const NUMBER = /^-?\d+([.,]\d+)?$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TAX_ID = /^([A-Z]{2}\s?)?(\d{10}|\d{3}-\d{3}-\d{2}-\d{2}|\d{3}-\d{2}-\d{2}-\d{3})$/
const PHONE = /^\+?\d[\d\s()-]{7,}\d$/
const ANCHOR_REACH_ABOVE = 0.08

const FALLBACK_FIELDS: { key: string; label: string; type: FieldDef['type']; hint: string }[] = [
  { key: 'title', label: 'Title', type: 'text', hint: 'The main title or subject of the document.' },
  { key: 'date', label: 'Date', type: 'date', hint: 'The date the document was issued.' },
  { key: 'total', label: 'Total', type: 'money', hint: 'The total amount stated on the document.' },
]

const newId = () => `field-${crypto.randomUUID().slice(0, 8)}`

export const toKey = (label: string): string =>
  label
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const sameLine = (a: BBox, b: BBox) => Math.abs(a.y - b.y) < Math.max(a.h, b.h) / 2

const guessType = (text: string): ScalarFieldType => {
  const value = text.trim()
  if (ISO_OR_DOTTED_DATE.test(value)) return 'date'
  if (EMAIL.test(value)) return 'email'
  if (TAX_ID.test(value)) return 'tax_id'
  if (MONEY.test(value)) return 'money'
  if (NUMBER.test(value)) return 'number'
  if (PHONE.test(value)) return 'phone'
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

export interface FieldGuess {
  label: string
  key: string
  type: ScalarFieldType
  hint: string
  anchorText?: string
}

const overlapsBox = (a: BBox, b: BBox) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Words ending at `index` on its line, going left, stopping at the previous "Label:". */
const wordsEndingAt = (tokens: Token[], index: number): string[] => {
  const words = [tokens[index].text.replace(/:$/, '')]
  for (let i = index - 1; i >= 0 && words.length < MAX_LABEL_WORDS; i--) {
    if (!sameLine(tokens[i].bbox, tokens[index].bbox) || tokens[i].text.endsWith(':')) break
    words.unshift(tokens[i].text)
  }
  return words
}

/** The nearest label left of the selection on its line, otherwise the nearest text directly above it. */
const findAnchor = (tokens: Token[], box: BBox): string[] | null => {
  const outside = tokens.map((token, i) => ({ token, i })).filter(({ token }) => !overlapsBox(token.bbox, box))
  const left = outside
    .filter(({ token }) => sameLine(token.bbox, box) && token.bbox.x + token.bbox.w <= box.x + 0.005)
    .sort((a, b) => b.token.bbox.x - a.token.bbox.x)[0]
  if (left) return wordsEndingAt(tokens, left.i)
  const above = outside
    .filter(({ token }) => {
      const gap = box.y - (token.bbox.y + token.bbox.h)
      const overlapsX = token.bbox.x < box.x + box.w && box.x < token.bbox.x + token.bbox.w
      return gap >= -0.005 && gap <= ANCHOR_REACH_ABOVE && overlapsX
    })
    .sort((a, b) => b.token.bbox.y - a.token.bbox.y)[0]
  return above ? wordsEndingAt(tokens, above.i) : null
}

/** Guess label, key, type and hint for a pointed-at selection (spec 015 slice 2). */
export const guessFromSelection = (tokens: Token[], box: BBox, text: string): FieldGuess => {
  const words = findAnchor(tokens, box)
  const type = guessType(text)
  if (!words) {
    return { label: 'New field', key: 'new_field', type, hint: 'The value at the selected place on the document.' }
  }
  const label = words.join(' ')
  return {
    label,
    key: toKey(label) || 'new_field',
    type,
    hint: `The value written next to the label "${label}".`,
    anchorText: `${label}:`,
  }
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
