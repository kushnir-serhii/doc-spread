/** Format checks shared by pointing (parse-field-value) and approval (validate-field-value). Formats only: no country checksums. */

export const isEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)

export const isPhone = (text: string) => /^[\d\s+\-()]+$/.test(text) && text.replace(/\D/g, '').length >= 6

/** A tax ID is stored without spaces and dashes. */
export const normalizeTaxId = (text: string) => text.replace(/[\s-]/g, '')

export const isTaxId = (text: string) => /^[A-Za-z0-9]{8,}$/.test(normalizeTaxId(text))

/** `YYYY-MM-DD` that exists on the calendar (not 2026-02-31). */
export const isIsoDate = (text: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}
