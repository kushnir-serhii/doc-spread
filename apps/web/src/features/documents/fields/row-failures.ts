/** Row id → the columns a failed row check reads in that row (may be empty: the row fails, no cell to mark). */
export type RowFailures = ReadonlyMap<string, ReadonlySet<string>>
