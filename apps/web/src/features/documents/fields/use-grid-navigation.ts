import { useRef, useState, type KeyboardEvent } from 'react'

export interface GridPos {
  row: number
  col: number
}

interface GridNavigationOptions {
  rowCount: number
  /** columns that hold data (and can be edited) */
  dataColCount: number
  /** a last column holds row actions: reachable by arrows, never edited */
  hasActionCol: boolean
  editable: boolean
}

const samePos = (a: GridPos | null, b: GridPos) => a !== null && a.row === b.row && a.col === b.col

/**
 * Spreadsheet keys for a grid (WAI-ARIA grid pattern): one cell is tabbable (roving tabindex), so Tab leaves the grid;
 * arrows, Home and End move; Enter, F2 or typing edit; Enter or Esc stop editing. While editing, arrows belong to the input.
 */
export const useGridNavigation = ({ rowCount, dataColCount, hasActionCol, editable }: GridNavigationOptions) => {
  const gridRef = useRef<HTMLTableElement>(null)
  const [current, setCurrent] = useState<GridPos>({ row: 0, col: 0 })
  const [editing, setEditing] = useState<GridPos | null>(null)
  const lastCol = dataColCount + (hasActionCol ? 1 : 0) - 1
  const lastRow = Math.max(0, rowCount - 1)
  const active: GridPos = { row: Math.min(current.row, lastRow), col: Math.min(current.col, lastCol) }

  const focusCell = (pos: GridPos) => {
    setCurrent(pos)
    gridRef.current?.querySelector<HTMLElement>(`[data-pos="${pos.row}:${pos.col}"]`)?.focus()
  }
  /** for cells that don't exist yet (a row just added) or that moved (a row just removed) */
  const focusCellSoon = (pos: GridPos) => {
    requestAnimationFrame(() => focusCell(pos))
  }

  const onCellFocus = (pos: GridPos) => {
    if (!samePos(active, pos)) setCurrent(pos)
    if (editing && !samePos(editing, pos)) setEditing(null)
  }

  const onCellKeyDown = (event: KeyboardEvent<HTMLElement>, pos: GridPos) => {
    // a child (an open select) already used the key
    if (event.defaultPrevented) return
    if (editing) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        setEditing(null)
        focusCell(pos)
      }
      return
    }
    // keys typed on the action button itself (Enter, Space) are its own
    if (event.target instanceof HTMLButtonElement && (event.key === 'Enter' || event.key === ' ')) return
    const move = (next: GridPos) => {
      event.preventDefault()
      focusCell(next)
    }
    const canEdit = editable && pos.col < dataColCount
    switch (event.key) {
      case 'ArrowUp':
        return move({ row: Math.max(0, pos.row - 1), col: pos.col })
      case 'ArrowDown':
        return move({ row: Math.min(lastRow, pos.row + 1), col: pos.col })
      case 'ArrowLeft':
        return move({ row: pos.row, col: Math.max(0, pos.col - 1) })
      case 'ArrowRight':
        return move({ row: pos.row, col: Math.min(lastCol, pos.col + 1) })
      case 'Home':
        return move({ row: event.ctrlKey ? 0 : pos.row, col: 0 })
      case 'End':
        return move({ row: event.ctrlKey ? lastRow : pos.row, col: lastCol })
      case 'Enter':
      case 'F2':
        if (canEdit) {
          event.preventDefault()
          setEditing(pos)
        }
        return
      default:
        // a printable key starts editing and is not swallowed: it lands in the input that takes focus
        if (canEdit && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) setEditing(pos)
    }
  }

  return { gridRef, nav: { active, editing, setEditing, onCellFocus, onCellKeyDown, focusCellSoon } }
}

export type GridNavigation = ReturnType<typeof useGridNavigation>['nav']
