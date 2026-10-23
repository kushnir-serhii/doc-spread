import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const ROWS = 8
const WIDTHS = ['w-48', 'w-24', 'w-20', 'w-24', 'w-20']

export const DocumentTableSkeleton = () => (
  <div role="status" aria-label="Loading documents" className="overflow-x-auto rounded-lg border">
    <Table>
      <TableBody>
        {Array.from({ length: ROWS }, (_, row) => (
          <TableRow key={row} className="h-14">
            {WIDTHS.map((width, col) => (
              <TableCell key={col}>
                <Skeleton className={cn('h-4 max-w-full', width)} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
