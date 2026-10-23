import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Document } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import type { DocumentColumn } from './document-column'
import { SelectCheckbox } from './select-checkbox'
import type { Selection } from './use-selection'

interface DocumentTableProps {
  documents: Document[]
  columns: DocumentColumn[]
  titleFor: (doc: Document) => string
  selection?: Selection
}

const alignClass = (column: DocumentColumn) => (column.align === 'right' ? 'text-right tabular-nums' : undefined)

export const DocumentTable = ({ documents, columns, titleFor, selection }: DocumentTableProps) => (
  <div className="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          {selection && (
            <TableHead className="w-touch">
              <SelectCheckbox
                label={`Select all ${documents.length} documents`}
                checked={selection.state === 'all'}
                indeterminate={selection.state === 'some'}
                onChange={selection.toggleAll}
              />
            </TableHead>
          )}
          {columns.map((column) => (
            <TableHead key={column.id} className={cn(alignClass(column))}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow
            key={doc.id}
            data-state={selection?.has(doc.id) ? 'selected' : undefined}
            className="relative min-h-touch cursor-pointer"
          >
            {selection && (
              <TableCell className="py-0">
                <SelectCheckbox
                  label={`Select ${titleFor(doc)}`}
                  checked={selection.has(doc.id)}
                  onChange={() => selection.toggle(doc.id)}
                />
              </TableCell>
            )}
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
