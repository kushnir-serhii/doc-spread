import type { ScalarFieldType } from '@/lib/mock/types'
import { parseFieldValue } from './parse-field-value'

/** Most specific first; text accepts anything, so it comes last. */
const GUESS_ORDER: readonly ScalarFieldType[] = ['date', 'money', 'number', 'email', 'phone', 'tax_id', 'text']

/**
 * The first type (other than `exclude`) the text parses as without assuming anything:
 * an amount with no currency is not a guess, so "12" reads as a number, not money.
 */
export const guessFieldType = (text: string, exclude: ScalarFieldType): ScalarFieldType | null =>
  GUESS_ORDER.find((type) => {
    if (type === exclude) return false
    const parsed = parseFieldValue({ type }, text)
    return parsed.ok && parsed.warning === undefined
  }) ?? null
