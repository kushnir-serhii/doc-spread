import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface ProcessingStateProps {
  /** What is happening now: "Reading the document…" */
  message: string
}

/** Progress text for the steps after the upload; announced as it changes. */
export const ProcessingState = ({ message }: ProcessingStateProps) => (
  <div className="flex flex-col gap-4">
    <p role="status" className="flex items-center gap-2 text-sm font-medium">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {message}
    </p>
    <div className="grid gap-6 lg:grid-cols-3" aria-hidden>
      <Skeleton className="h-96 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
      <Skeleton className="hidden h-96 w-full rounded-lg lg:block" />
    </div>
  </div>
)
