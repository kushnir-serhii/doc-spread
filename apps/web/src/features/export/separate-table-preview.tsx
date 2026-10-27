import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Document, ExportFormat } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import type { SeparateTable } from './export-plan'

interface SeparateTablePreviewProps {
  table: SeparateTable
  format: ExportFormat
  /** the selected documents, in list order */
  documents: Document[]
}

const PREVIEW_DOCUMENTS = 3
const PREVIEW_ROWS = 5

/** One separate sheet/file: its first rows, then the count over all selected documents. */
export const SeparateTablePreview = ({ table, format, documents }: SeparateTablePreviewProps) => {
  const total = documents.reduce((sum, doc) => sum + table.rowsFor(doc).length, 0)
  const rows = documents
    .slice(0, PREVIEW_DOCUMENTS)
    .flatMap((doc) => table.rowsFor(doc).map((cells) => ({ doc, cells })))
    .slice(0, PREVIEW_ROWS)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {format === 'xlsx' ? 'Sheet' : 'File'} <span className="font-medium text-foreground">{table.name}</span>
      </p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {table.headers.map((header, i) => (
                <TableHead key={i} className={cn('whitespace-nowrap', table.numeric[i] && 'text-right')}>
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.headers.length} className="text-center text-muted-foreground">
                  No rows in the first documents.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ doc, cells }, rowIndex) => (
                <TableRow key={`${doc.id}-${rowIndex}`}>
                  {cells.map((cell, i) => (
                    <TableCell
                      key={i}
                      title={cell}
                      className={cn('max-w-64 truncate tabular-nums', table.numeric[i] && 'text-right')}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'row' : 'rows'} from {documents.length}{' '}
        {documents.length === 1 ? 'document' : 'documents'}
      </p>
    </div>
  )
}
