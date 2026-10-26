import { LOW_CONFIDENCE } from '@/lib/fields/confidence'
import { toMajor } from '@/lib/fields/currency-digits'
import type { Confidence, CurrencyCode } from './types'

/**
 * Formats an amount given in minor units (cents, or yen for JPY: see minorDigits).
 * No `locale`: the browser's; a company locale (spec 011) is passed in once it exists.
 */
export function formatMoney(
  minor: number | null | undefined,
  currency: CurrencyCode | string,
  locale?: string,
): string {
  if (minor === null || minor === undefined) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(toMajor(minor, currency))
}

/** No `locale`: the browser's (see formatMoney). */
export function formatDate(
  iso: string | null | undefined,
  locale?: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, options).format(d)
}

export function confidenceLevel(score: number): Confidence {
  if (score >= LOW_CONFIDENCE) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}
