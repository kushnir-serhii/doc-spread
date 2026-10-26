import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { SampleSummary as Summary } from './use-sample-summary'

const plural = (count: number, word: string) => (count === 1 ? word : `${word}s`)

interface SampleSummaryProps {
  summary: Summary
  sampleCount: number
}

/** "12/14 fields found on all samples", announced when it changes; the gaps are listed in a disclosure. */
export const SampleSummary = ({ summary, sampleCount }: SampleSummaryProps) => {
  if (summary.status === 'failed') {
    return (
      <p role="status" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-destructive">
        Couldn’t test the fields on every sample.
        <Button size="sm" variant="outline" className="min-h-touch md:min-h-9" onClick={summary.retry}>
          Retry
        </Button>
      </p>
    )
  }
  if (summary.status === 'loading') {
    return (
      <div role="status" className="mb-4">
        <span className="sr-only">Testing the fields on the samples…</span>
        <Skeleton className="h-5 w-64" aria-hidden />
      </div>
    )
  }
  // no samples (or no fields) yet: nothing was tested, so nothing is claimed
  if (summary.total === 0 || sampleCount === 0) return <p role="status" className="mb-4 empty:hidden" />
  const where = sampleCount === 1 ? 'on the sample' : 'on all samples'
  return (
    <div className="mb-4 flex flex-col gap-1 text-sm">
      <p role="status" className="font-medium">
        {summary.found}/{summary.total} fields found {where}
      </p>
      {summary.missing.length > 0 && (
        <details>
          <summary className="inline-flex min-h-touch cursor-pointer items-center gap-1 text-muted-foreground md:min-h-9">
            <TriangleAlert className="size-4" aria-hidden /> {summary.missing.length} {plural(summary.missing.length, 'field')} not found everywhere
          </summary>
          <ul className="ml-5 list-disc text-muted-foreground">
            {summary.missing.map((item) => (
              <li key={item.fieldId} className="break-words">
                {item.label}: not found on {plural(item.samples.length, 'sample')} {item.samples.join(', ')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
