import { Skeleton } from '@/components/ui/skeleton'

export const GroupingsSkeleton = () => (
  <div role="status" aria-label="Loading groups" className="grid gap-2 sm:grid-cols-2">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} className="h-24 w-full rounded-lg" />
    ))}
  </div>
)
