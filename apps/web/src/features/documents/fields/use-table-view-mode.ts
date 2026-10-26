import { useState } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'

export type TableViewMode = 'table' | 'list'

const STORAGE_KEY = 'docspread.table-view'

const read = (): TableViewMode | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'table' || stored === 'list' ? stored : null
  } catch {
    return null
  }
}

/** Table from `md` up, List below; the viewer's own choice wins and is remembered by the browser (works without it). */
export const useTableViewMode = () => {
  const wide = useMediaQuery('(min-width: 768px)')
  const [chosen, setChosen] = useState(read)
  const mode: TableViewMode = chosen ?? (wide ? 'table' : 'list')
  const setMode = (next: TableViewMode) => {
    setChosen(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage is unavailable: the choice lasts until reload
    }
  }
  return { mode, setMode }
}
