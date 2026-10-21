import type { Confidence, CurrencyCode } from './types'

/** Formats an amount given in minor units (2 decimals for all supported currencies). */
export function formatMoney(
  minor: number | null | undefined,
  currency: CurrencyCode | string,
  locale = 'pl-PL',
): string {
  if (minor === null || minor === undefined) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100)
}

export function formatDate(
  iso: string | null | undefined,
  locale = 'pl-PL',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, options).format(d)
}

export function confidenceLevel(score: number): Confidence {
  if (score >= 0.9) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}
