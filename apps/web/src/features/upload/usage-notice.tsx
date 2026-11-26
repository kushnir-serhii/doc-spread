import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlan } from '@/lib/api'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'
import { cn } from '@/lib/utils'
import { describeUsage } from './usage-state'

/** "N of M documents this month": quiet while there is room, a warning from 80%. */
export const UsageNotice = () => {
  const plan = usePlan()
  const locale = useFormatLocale()

  if (plan.isPending) {
    return <Skeleton role="status" aria-label="Loading usage" className="h-5 w-56" />
  }

  if (plan.isError) {
    // uploading still works: the line is optional, so this stays quiet
    return (
      <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        <p>Couldn&apos;t load your monthly usage.</p>
        <Button type="button" variant="ghost" size="sm" className="min-h-touch md:min-h-8" onClick={() => void plan.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const usage = describeUsage(plan.data, locale)
  if (usage.level === 'ok') {
    return <p className="text-sm text-muted-foreground tabular-nums">{usage.line}</p>
  }
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm tabular-nums',
        usage.level === 'limit'
          ? 'border-danger bg-danger-soft text-danger-soft-foreground'
          : 'border-warning bg-warning-soft text-warning-soft-foreground',
      )}
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{usage.line}{usage.level === 'warning' ? ` ${usage.detail}` : ''}</span>
    </p>
  )
}
