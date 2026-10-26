import { Skeleton } from '@/components/ui/skeleton'

export const ExportSkeleton = () => (
  <div role="status" aria-label="Loading export" className="flex flex-col gap-6">
    <Skeleton className="h-11 w-full max-w-sm" />
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
)
