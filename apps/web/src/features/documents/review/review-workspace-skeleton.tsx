import { Skeleton } from '@/components/ui/skeleton'

const ROWS = ['a', 'b', 'c', 'd', 'e']

/** The workspace while the type loads: a viewer block and field rows. */
export const ReviewWorkspaceSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start" role="status" aria-label="Loading fields">
    <Skeleton className="h-96 lg:h-review-pane" />
    <div className="flex flex-col gap-3">
      {ROWS.map((row) => (
        <Skeleton key={row} className="h-20" />
      ))}
    </div>
  </div>
)
