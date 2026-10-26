import type { CurrencyCode } from '@/lib/mock/types'

/**
 * The fallback when nothing names a currency: not tied to any country. Wherever it is
 * assumed instead of read from the document, the user must be warned (docs/conventions.md, Money).
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'USD'
