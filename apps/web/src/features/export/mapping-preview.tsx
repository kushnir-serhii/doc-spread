import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Document, ExportFormat } from '@/lib/mock/types'
import type { ExportPlan } from './export-plan'
import { cn } from '@/lib/utils'

interface MappingPreviewProps {
  plan: ExportPlan
  format: ExportFormat
  /** the selected documents, in list order */
  documents: Document[]
}

const PREVIEW_DOCUMENTS = 3

const rowCount = (doc: Document, fieldId: string): number => {
  const value = doc.values[fieldId]
  return value?.type === 'table' ? value.rows.length : 0
}

/** The first documents as the main file would have them. */
export const MappingPreview = ({ plan, format, documents }: MappingPreviewProps) => {
  if (documents.length === 0) {
    return (
      <p role="status" className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Select documents above to see a preview.
      </p>
    )
  }
  const rows = documents.slice(0, PREVIEW_DOCUMENTS).flatMap((doc) => plan.rowsFor(doc).map((cells) => ({ doc, cells })))
  const kind = format === 'xlsx' ? 'sheet' : 'file'
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {plan.headers.map((header, i) => (
                <TableHead key={i} className={cn('whitespace-nowrap', plan.numeric[i] && 'text-right')}>
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ doc, cells }, rowIndex) => (
              <TableRow key={`${doc.id}-${rowIndex}`}>
                {cells.map((cell, i) => (
                  <TableCell
                    key={i}
                    title={cell}
                    className={cn('max-w-64 truncate tabular-nums', plan.numeric[i] && 'text-right')}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {plan.separate.map((table) => {
        const total = documents.reduce((sum, doc) => sum + rowCount(doc, table.field.id), 0)
        return (
          <p key={table.columnKey} className="text-sm text-muted-foreground">
            + {kind} <span className="font-medium text-foreground">{table.name}</span> ({total} {total === 1 ? 'row' : 'rows'}{' '}
            from {documents.length} {documents.length === 1 ? 'document' : 'documents'})
          </p>
        )
      })}
    </div>
  )
}
