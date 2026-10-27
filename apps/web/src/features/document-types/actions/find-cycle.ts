/** The ids of a chain A → B → A, or null. `deps` maps a computed id to the ids its expression reads. */
export const findCycle = (deps: ReadonlyMap<string, readonly string[]>, start: string): string[] | null => {
  const visit = (id: string, path: string[]): string[] | null => {
    for (const next of deps.get(id) ?? []) {
      if (next === start) return [...path, start]
      if (!path.includes(next) && deps.has(next)) {
        const found = visit(next, [...path, next])
        if (found) return found
      }
    }
    return null
  }
  return visit(start, [start])
}
