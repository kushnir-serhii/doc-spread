import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlan } from '@/lib/api'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'
import { UsageMeter } from './usage-meter'

export const PlanTab = () => {
  const plan = usePlan()
  const locale = useFormatLocale()

  if (plan.isPending) {
    return (
      <div role="status" aria-label="Loading plan" className="flex max-w-lg flex-col gap-4 rounded-lg border p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (plan.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p>Could not load your plan.</p>
        <Button type="button" variant="outline" className="min-h-touch md:min-h-9" onClick={() => void plan.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const { plan: current, documentsThisMonth, types, periodStart } = plan.data
  const month = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(periodStart))

  return (
    <section aria-labelledby="plan-heading" className="flex max-w-lg flex-col gap-5 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <h2 id="plan-heading" className="text-lg font-semibold">
          {current.name} plan
        </h2>
        <p className="text-sm text-muted-foreground">Plan changes and billing come later.</p>
      </div>
      <UsageMeter
        label="Documents processed this month"
        caption={month}
        value={documentsThisMonth}
        limit={current.documentsPerMonth}
        locale={locale}
      />
      <UsageMeter label="Document types" value={types} limit={current.typeLimit} locale={locale} />
    </section>
  )
}
