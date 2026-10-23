import { Skeleton } from '@/components/ui/skeleton'

export const TypeSwitcherSkeleton = () => (
  <div role="status" aria-label="Loading document types" className="mb-4 flex h-touch items-center gap-4 border-b">
    <Skeleton className="h-4 w-10" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-24" />
  </div>
)
