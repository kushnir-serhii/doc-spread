/** "1 row", "64 rows". */
export const rowsText = (count: number) => `${count} ${count === 1 ? 'row' : 'rows'}`

/** How many rows a row preview lists before "…and N more". */
export const MAX_PREVIEW_ROWS = 3
