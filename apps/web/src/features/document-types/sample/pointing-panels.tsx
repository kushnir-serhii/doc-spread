import { SuggestionPanel } from './suggestion-panel'
import { TableSuggestionPanel } from './table-suggestion-panel'
import type { useAddTable } from './use-add-table'
import type { usePointToAdd } from './use-point-to-add'

interface PointingPanelsProps {
  point: ReturnType<typeof usePointToAdd>
  table: ReturnType<typeof useAddTable>
}

/** The status line and the panel of whichever selection is being confirmed (a field or a table). */
export const PointingPanels = ({ point, table }: PointingPanelsProps) => (
  <>
    <p role="status" className="text-sm text-muted-foreground empty:hidden">
      {point.notice || table.notice}
    </p>
    {point.selection && (
      <SuggestionPanel
        selection={point.selection}
        suggestion={point.suggest.data}
        loading={point.suggest.isPending}
        failed={point.suggest.isError}
        overlap={point.overlap}
        onRetry={point.retry}
        onAdd={point.add}
        onFix={point.fix}
        onCancel={point.cancel}
      />
    )}
    {table.selection && (
      <TableSuggestionPanel
        suggestion={table.suggest.data}
        loading={table.suggest.isPending}
        error={table.suggest.error}
        onRetry={table.retry}
        onAdd={table.add}
        onCancel={table.cancel}
      />
    )}
  </>
)
