import { Skeleton } from '@/components/ui/skeleton'
import { ReviewWorkspaceSkeleton } from './review-workspace-skeleton'

export const ReviewSkeleton = () => (
  <div className="flex flex-col gap-4" role="status" aria-label="Loading document">
    <Skeleton className="h-11 w-24" />
    <Skeleton className="h-8 w-80 max-w-full" />
    <Skeleton className="h-5 w-40" />
    <ReviewWorkspaceSkeleton />
  </div>
)
