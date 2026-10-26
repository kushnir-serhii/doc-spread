import type { GroupValue } from '@/lib/mock/types'

// same rule as the mock's grouping: trim, lowercase, collapse whitespace
const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')

/** The row for a ?value= param: exact match first, then a normalized one (hand-edited URLs). */
export const findGroupValue = (values: GroupValue[], value: string): GroupValue | undefined => {
  const exact = values.find((group) => group.value === value)
  if (exact) return exact
  const wanted = normalize(value)
  return values.find((group) => normalize(group.value) === wanted)
}
