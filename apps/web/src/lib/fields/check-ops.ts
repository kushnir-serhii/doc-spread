import type { CompareOp } from '@/lib/mock/types'

export const OP_SYMBOL: Record<CompareOp, string> = {
  eq: '=',
  neq: '≠',
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
}

/** What it means when the check fails: "=" failed reads "≠". */
export const NEGATED_OP_SYMBOL: Record<CompareOp, string> = {
  eq: '≠',
  neq: '=',
  lt: '≥',
  lte: '>',
  gt: '≤',
  gte: '<',
}

export const OP_LABEL: Record<CompareOp, string> = {
  eq: 'equals (=)',
  neq: 'is not equal to (≠)',
  lt: 'is less than (<)',
  lte: 'is at most (≤)',
  gt: 'is greater than (>)',
  gte: 'is at least (≥)',
}
