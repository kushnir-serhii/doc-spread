import { Skeleton } from '@/components/ui/skeleton'

const ROWS = 6

export const HistorySkeleton = () => (
  <div role="status" aria-label="Loading export history" className="space-y-2">
    {Array.from({ length: ROWS }, (_, row) => (
      <Skeleton key={row} className="h-14 w-full" />
    ))}
  </div>
)
