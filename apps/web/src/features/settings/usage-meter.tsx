import { cn } from '@/lib/utils'

export interface UsageMeterProps {
  label: string
  /** Shown under the label, e.g. the month the count covers. */
  caption?: string
  value: number
  /** `null` = unlimited: no bar. */
  limit: number | null
  locale: string | undefined
}

/** At or above this share of the limit the meter turns to a warning. */
const WARNING_SHARE = 0.9

export const UsageMeter = ({ label, caption, value, limit, locale }: UsageMeterProps) => {
  const number = new Intl.NumberFormat(locale)
  const share = limit === null ? 0 : value / limit
  const over = limit !== null && value > limit
  const near = share >= WARNING_SHARE

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
        </div>
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{number.format(value)}</span>
          {limit === null ? (
            <span className="text-muted-foreground"> · Unlimited</span>
          ) : (
            <span className="text-muted-foreground"> of {number.format(limit)}</span>
          )}
        </p>
      </div>
      {limit === null ? null : (
        <>
          <progress
            value={Math.min(value, limit)}
            max={limit}
            aria-label={label}
            aria-valuetext={`${number.format(value)} of ${number.format(limit)}`}
            className={cn(
              'h-2 w-full overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted',
              near
                ? 'text-warning [&::-webkit-progress-value]:bg-warning [&::-moz-progress-bar]:bg-warning'
                : 'text-primary [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary',
              over && '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger',
              '[&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full',
            )}
          />
          {near ? (
            <p className={cn('text-xs font-medium', over ? 'text-danger-soft-foreground' : 'text-warning-soft-foreground')}>
              {over ? 'Over the limit.' : 'Close to the limit.'}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
