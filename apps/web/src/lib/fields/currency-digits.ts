const cache = new Map<string, number>()

/** Decimal places of the currency's minor unit (USD 2, JPY 0), from Intl; 2 if the code is unknown. */
export const minorDigits = (currency: string): number => {
  const cached = cache.get(currency)
  if (cached !== undefined) return cached
  let digits: number
  try {
    digits = new Intl.NumberFormat(undefined, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    digits = 2
  }
  cache.set(currency, digits)
  return digits
}

/** Minor units to major units: 1250 USD -> 12.5, 1500 JPY -> 1500. */
export const toMajor = (amount: number, currency: string): number => amount / 10 ** minorDigits(currency)

/** Major units to whole minor units (rounded): 12.5 USD -> 1250, 1500 JPY -> 1500. */
export const toMinor = (major: number, currency: string): number => Math.round(major * 10 ** minorDigits(currency))

/** Major units as plain text with the currency's decimals, dot separator: 1250 USD -> "12.50", 1500 JPY -> "1500". */
export const majorText = (amount: number, currency: string): string =>
  toMajor(amount, currency).toFixed(minorDigits(currency))
