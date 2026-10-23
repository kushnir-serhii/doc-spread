import { Skeleton } from '@/components/ui/skeleton'

export const TypesSkeleton = () => (
  <div role="status" aria-label="Loading document types" className="flex flex-col gap-2">
    {Array.from({ length: 4 }, (_, i) => (
      <Skeleton key={i} className="h-20 w-full rounded-lg sm:h-16" />
    ))}
  </div>
)
