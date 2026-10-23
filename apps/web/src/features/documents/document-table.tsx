import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Document } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import type { DocumentColumn } from './document-column'

interface DocumentTableProps {
  documents: Document[]
  columns: DocumentColumn[]
}

const alignClass = (column: DocumentColumn) => (column.align === 'right' ? 'text-right tabular-nums' : undefined)

export const DocumentTable = ({ documents, columns }: DocumentTableProps) => (
  <div className="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={cn(alignClass(column))}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id} className="relative min-h-touch cursor-pointer">
            {columns.map((column) => (
              <TableCell key={column.id} className={cn(alignClass(column))}>
                {column.cell(doc)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
