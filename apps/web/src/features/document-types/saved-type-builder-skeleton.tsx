import { Skeleton } from '@/components/ui/skeleton'

export const SavedTypeBuilderSkeleton = () => (
  <div role="status" aria-label="Loading document type" className="flex flex-col gap-4">
    <Skeleton className="h-9 w-full max-w-3xl" />
    <Skeleton className="h-20 w-full max-w-3xl" />
    <div className="grid gap-6 lg:grid-cols-5">
      <Skeleton className="h-64 w-full rounded-lg lg:col-span-2" />
      <Skeleton className="hidden h-64 w-full rounded-lg lg:col-span-3 lg:block" />
    </div>
  </div>
)
