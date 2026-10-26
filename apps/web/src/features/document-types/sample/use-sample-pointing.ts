import type { ViewerMode } from '@/features/documents/viewer/viewer-types'
import type { usePointAgain } from './use-point-again'
import type { useAddTable } from './use-add-table'
import type { usePointToAdd } from './use-point-to-add'

type Flow = 'point' | 'again' | 'table'

/** One kind of pointing at a time (Point to add, Point again, Add a table): starting one ends the others. */
export const useSamplePointing = (
  point: ReturnType<typeof usePointToAdd>,
  again: ReturnType<typeof usePointAgain>,
  table: ReturnType<typeof useAddTable>,
) => {
  const active: Flow | null = again.pointing ? 'again' : table.pointing ? 'table' : point.pointing ? 'point' : null

  const endOthers = (keep: Flow) => {
    if (keep !== 'again') again.cancel()
    if (keep !== 'point' && (point.pointing || point.selection)) point.cancel()
    if (keep !== 'table' && (table.pointing || table.selection)) table.cancel()
  }
  const mode: ViewerMode = active === 'table' ? 'select-region' : active ? 'select-words' : 'view'

  return {
    mode,
    select: active === 'again' ? again.select : active === 'table' ? table.select : point.select,
    cancel: active === 'again' ? again.cancel : active === 'table' ? table.cancel : point.cancel,
    togglePoint: () => {
      endOthers('point')
      point.toggle()
    },
    toggleTable: () => {
      endOthers('table')
      table.toggle()
    },
    startAgain: (fieldId: string) => {
      endOthers('again')
      again.start(fieldId)
    },
  }
}
