import { cn } from '@/lib/utils'

interface UploadProgressProps {
  label: string
  /** 0..1; omit for an indeterminate bar (waiting on the server) */
  value?: number
}

export const UploadProgress = ({ label, value }: UploadProgressProps) => {
  const percent = value === undefined ? undefined : Math.round(value * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full bg-primary', percent === undefined && 'w-1/3 animate-pulse')}
        // inline width: the only way to render an arbitrary percentage (shadcn's Progress does the same)
        style={percent === undefined ? undefined : { width: `${percent}%` }}
      />
    </div>
  )
}
