import type { FieldDef } from '@/lib/mock/types'

/** Letters that fold to ASCII but don't decompose with NFD. */
const EXTRA_FOLDS: Record<string, string> = { ł: 'l', đ: 'd', ø: 'o', ß: 'ss', æ: 'ae', œ: 'oe' }

const foldToAscii = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[łđøßæœ]/g, (char) => EXTRA_FOLDS[char] ?? char)

/** A label as an export key: "Data wystawienia" -> "data_wystawienia". */
export const slugifyKey = (label: string) =>
  foldToAscii(label)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

/** What the user may type into a key input: lowercase ASCII, digits and underscores. */
export const sanitizeKey = (value: string) => foldToAscii(value).replace(/[^a-z0-9_]+/g, '_')

/** `base`, or `base_2`, `base_3`… when taken. An empty base stays empty. */
export const uniqueKey = (base: string, taken: readonly string[]) => {
  if (base === '' || !taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}

export const getKeyError = (field: Pick<FieldDef, 'id' | 'key'>, fields: readonly Pick<FieldDef, 'id' | 'key'>[]) => {
  if (field.key === '') return 'Key is required.'
  if (fields.some((other) => other.id !== field.id && other.key === field.key)) {
    return 'Another field already uses this key.'
  }
  return null
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

/** What would be lost by switching to `next`, or null when nothing is. */
export const getTypeChangeLoss = (field: FieldDef, next: FieldDef['type']) => {
  if (next === field.type) return null
  const options = field.options?.length ?? 0
  if (field.type === 'select' && options > 0) return `${plural(options, 'option')} will be removed.`
  const columns = field.columns?.length ?? 0
  if (field.type === 'table' && columns > 0) return `${plural(columns, 'column')} will be removed.`
  return null
}
