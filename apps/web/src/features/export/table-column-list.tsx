import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { isComputedColumn } from '@/lib/fields/computed-fields'
import { resolveTableColumns, tableColumnKey } from '@/lib/fields/export-mapping'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { DocumentType, ExportColumnMapping, ExportTableColumn, FieldDef } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { ColumnRow } from './column-row'

interface TableColumnListProps {
  type: DocumentType
  /** the table field */
  field: FieldDef
  mapping: ExportColumnMapping
  /** inline errors by column key */
  errors: Map<string, string>
  onChange: (mapping: ExportColumnMapping) => void
}

/** Collapsed disclosure "Columns (n of m)" with the include, header and order of one table's columns. */
export const TableColumnList = ({ type, field, mapping, errors, onChange }: TableColumnListProps) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const columns = resolveTableColumns(mapping, field)
  const defs = field.columns ?? []
  const included = columns.filter((c) => c.include).length
  // a column with an error must be visible, so the list stays open while any has one (or none is included)
  const hasError = included === 0 || columns.some((c) => errors.has(tableColumnKey(field.id, c.columnId)))
  const expanded = open || hasError

  const save = (next: ExportTableColumn[]) =>
    onChange({ ...mapping, tableColumns: { ...mapping.tableColumns, [field.id]: next } })

  const patch = (index: number, change: Partial<ExportTableColumn>) =>
    save(columns.map((c, i) => (i === index ? { ...c, ...change } : c)))

  const move = (index: number, delta: -1 | 1, label: string) => {
    const next = [...columns]
    const [item] = next.splice(index, 1)
    if (!item) return
    next.splice(index + delta, 0, item)
    save(next)
    setAnnouncement(`${label} moved to position ${index + delta + 1} of ${next.length}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        onClick={() => setOpen(!open)}
        className="flex min-h-touch w-fit max-w-full items-center gap-1 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9"
      >
        <ChevronRight className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-90')} aria-hidden />
        Columns ({included} of {columns.length})
      </button>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <ul id={`${id}-list`} hidden={!expanded} className="divide-y rounded-lg border bg-background">
        {columns.map((col, index) => {
          const def = defs.find((c) => c.id === col.columnId)
          if (!def) return null
          const key = tableColumnKey(field.id, col.columnId)
          return (
            <ColumnRow
              key={key}
              label={def.label}
              kind={FIELD_TYPE_META[def.type].label}
              include={col.include}
              header={col.header}
              error={errors.get(key)}
              canMoveUp={index > 0}
              canMoveDown={index < columns.length - 1}
              onIncludeChange={(include) => patch(index, { include })}
              onHeaderChange={(header) => patch(index, { header })}
              onMove={(delta) => move(index, delta, def.label)}
            >
              {isComputedColumn(type, field.id, def.id) && (
                <p className="pl-7 text-xs text-muted-foreground">Computed</p>
              )}
            </ColumnRow>
          )
        })}
      </ul>
    </div>
  )
}
