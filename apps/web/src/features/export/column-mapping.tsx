import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BUILTIN_LABELS, columnKey, defaultExportMapping } from '@/lib/fields/export-mapping'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { Document, DocumentType, ExportColumn, ExportColumnMapping, ExportFormat } from '@/lib/mock/types'
import { ColumnRow } from './column-row'
import { headerErrors } from './export-header-errors'
import { buildExportPlan, isDocumentIdForced, resolveTableModes } from './export-plan'
import { MappingPreview } from './mapping-preview'
import { TableColumnList } from './table-column-list'
import { TableModeControl } from './table-mode-control'

interface ColumnMappingProps {
  type: DocumentType
  format: ExportFormat
  mapping: ExportColumnMapping
  onChange: (mapping: ExportColumnMapping) => void
  /** the selected documents, in list order */
  documents: Document[]
}

export const ColumnMapping = ({ type, format, mapping, onChange, documents }: ColumnMappingProps) => {
  const [announcement, setAnnouncement] = useState('')

  if (format === 'pdf_bundle') {
    return (
      <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        The PDF bundle holds the original documents, not columns, so there is nothing to map.
      </p>
    )
  }

  const plan = buildExportPlan(type, mapping, format)
  const errors = headerErrors(type, mapping, format)
  const modes = resolveTableModes(type, mapping, format)
  const idForced = isDocumentIdForced(type, mapping, format)
  const unit = format === 'xlsx' ? 'sheet' : 'file'
  const lockedReason = `Required: ${plan.separate.map((t) => t.name).join(', ')} goes to its own ${unit}, linked by this column.`

  const patch = (index: number, change: Partial<ExportColumn>) =>
    onChange({ ...mapping, columns: mapping.columns.map((c, i) => (i === index ? { ...c, ...change } : c)) })

  const move = (index: number, delta: -1 | 1, label: string) => {
    const columns = [...mapping.columns]
    const [item] = columns.splice(index, 1)
    if (!item) return
    columns.splice(index + delta, 0, item)
    onChange({ ...mapping, columns })
    setAnnouncement(`${label} moved to position ${index + delta + 1} of ${columns.length}`)
  }

  const setTableMode = (fieldId: string, mode: 'separate' | 'flatten') =>
    onChange({ ...mapping, tables: { ...mapping.tables, [fieldId]: mode } })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Tick what to export, rename the headers and set the order.</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-touch md:min-h-9"
          onClick={() => onChange(defaultExportMapping(type))}
        >
          <RotateCcw aria-hidden />
          Reset to default
        </Button>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <ul className="divide-y rounded-lg border">
        {mapping.columns.map((column, index) => {
          const key = columnKey(column)
          const { source } = column
          const field = source.kind === 'field' ? type.fields.find((f) => f.id === source.fieldId) : undefined
          const label = source.kind === 'builtin' ? BUILTIN_LABELS[source.id] : (field?.label ?? column.header)
          const kind = field ? FIELD_TYPE_META[field.type].label : 'Built-in'
          const locked = source.kind === 'builtin' && source.id === 'document_id' && idForced
          const otherFlattened = field ? [...modes].some(([id, mode]) => id !== field.id && mode === 'flatten') : false
          return (
            <ColumnRow
              key={key}
              label={label}
              kind={kind}
              include={column.include}
              header={column.header}
              error={errors.get(key)}
              lockedReason={locked ? lockedReason : undefined}
              canMoveUp={index > 0}
              canMoveDown={index < mapping.columns.length - 1}
              onIncludeChange={(include) => patch(index, { include })}
              onHeaderChange={(header) => patch(index, { header })}
              onMove={(delta) => move(index, delta, label)}
            >
              {field?.type === 'table' && column.include && (
                <>
                  <TableModeControl
                    format={format}
                    mode={modes.get(field.id) ?? mapping.tables[field.id] ?? 'separate'}
                    flattenDisabledReason={
                      otherFlattened
                        ? 'Only one table can have a row per table row; the others go to separate files.'
                        : undefined
                    }
                    onChange={(mode) => setTableMode(field.id, mode)}
                  />
                  <TableColumnList type={type} field={field} mapping={mapping} errors={errors} onChange={onChange} />
                </>
              )}
            </ColumnRow>
          )
        })}
      </ul>
      <section aria-labelledby="export-preview" className="flex flex-col gap-2">
        <h3 id="export-preview" className="text-sm font-semibold">
          Preview
        </h3>
        <MappingPreview plan={plan} format={format} documents={documents} />
      </section>
    </div>
  )
}
