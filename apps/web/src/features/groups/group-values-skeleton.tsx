import { Skeleton } from '@/components/ui/skeleton'

export const GroupValuesSkeleton = () => (
  <div role="status" aria-label="Loading values" className="grid gap-2">
    {Array.from({ length: 6 }, (_, i) => (
      <Skeleton key={i} className="h-16 w-full rounded-lg md:h-12" />
    ))}
  </div>
)
