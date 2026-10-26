import type { FunctionId } from '@/lib/mock/types'

/** Names of the arguments of the functions where "Argument 1" would not say enough. */
const ARG_LABELS: Partial<Record<FunctionId, readonly string[]>> = {
  subtract: ['From', 'Minus'],
  multiply: ['Value', 'Times'],
  divide: ['Dividend', 'Divisor'],
  percent: ['Percent', 'Of'],
  round: ['Value', 'Decimals'],
  days_between: ['From date', 'To date'],
  add_days: ['Date', 'Days'],
  add_months: ['Date', 'Months'],
  if_empty: ['Value', 'Fallback'],
}

export const argLabel = (fn: FunctionId, index: number) => ARG_LABELS[fn]?.[index] ?? `Argument ${index + 1}`
