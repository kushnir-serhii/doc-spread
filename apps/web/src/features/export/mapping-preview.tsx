import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Document, ExportFormat } from '@/lib/mock/types'
import type { ExportPlan } from './export-plan'
import { cn } from '@/lib/utils'
import { SeparateTablePreview } from './separate-table-preview'

interface MappingPreviewProps {
  plan: ExportPlan
  format: ExportFormat
  /** the selected documents, in list order */
  documents: Document[]
}

const PREVIEW_DOCUMENTS = 3

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
  return (
    <div className="flex flex-col gap-4">
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
      {plan.separate.map((table) => (
        <SeparateTablePreview key={table.columnKey} table={table} format={format} documents={documents} />
      ))}
    </div>
  )
}
