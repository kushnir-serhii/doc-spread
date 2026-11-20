import type { FieldValue } from '@/lib/mock/types'

/** Mean confidence over the top-level values; a table counts once, as the mean of its cells. */
export const overallConfidence = (values: Record<string, FieldValue>): number => {
  const scores: number[] = []
  for (const value of Object.values(values)) {
    if (value.type !== 'table') {
      scores.push(value.confidence)
    } else {
      const cells = value.rows.flatMap((row) => Object.values(row.cells))
      if (cells.length > 0) scores.push(cells.reduce((s, c) => s + c.confidence, 0) / cells.length)
    }
  }
  if (scores.length === 0) return 0
  return Math.round((scores.reduce((s, c) => s + c, 0) / scores.length) * 100) / 100
}

/** A person confirmed these values: confidence 1 on the scalar, or on every cell of the table. */
export function confirm(value: FieldValue): FieldValue {
  if (value.type !== 'table') return { ...value, confidence: 1 }
  return {
    ...value,
    rows: value.rows.map((row) => ({
      ...row,
      cells: Object.fromEntries(Object.entries(row.cells).map(([id, cell]) => [id, { ...cell, confidence: 1 }])),
    })),
  }
}
