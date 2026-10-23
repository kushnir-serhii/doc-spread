import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldDef } from '@/lib/mock/types'

interface TableColumnsSectionProps {
  table: FieldDef
  onAddColumn: () => void
}

/** The "Columns" part of a table field's editor; the columns themselves are edited from the list. */
export const TableColumnsSection = ({ table, onAddColumn }: TableColumnsSectionProps) => {
  const count = table.columns?.length ?? 0
  return (
    <section aria-label="Columns" className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Columns ({count})</h3>
        <Button variant="outline" className="min-h-touch md:min-h-9" onClick={onAddColumn}>
          <Plus aria-hidden />
          Add column
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Each row of the table is read with these columns. Select a column in the list to edit it.
      </p>
    </section>
  )
}
