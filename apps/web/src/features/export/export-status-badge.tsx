import { CircleCheck, Clock, LoaderCircle, OctagonAlert, type LucideIcon } from 'lucide-react'
import type { ExportStatus } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

const META: Record<ExportStatus, { label: string; icon: LucideIcon; className: string; spin?: boolean }> = {
  queued: { label: 'Queued', icon: Clock, className: 'bg-status-uploaded-bg text-status-uploaded-fg' },
  processing: {
    label: 'Processing',
    icon: LoaderCircle,
    className: 'bg-status-processing-bg text-status-processing-fg',
    spin: true,
  },
  completed: { label: 'Completed', icon: CircleCheck, className: 'bg-status-approved-bg text-status-approved-fg' },
  failed: {
    label: 'Failed',
    icon: OctagonAlert,
    className: 'bg-status-error-bg text-status-error-fg ring-1 ring-inset ring-status-error-dot/40',
  },
}

interface ExportStatusBadgeProps {
  status: ExportStatus
}

/** Export job status pill; icon + label, never color alone. */
export const ExportStatusBadge = ({ status }: ExportStatusBadgeProps) => {
  const meta = META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        meta.className,
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', meta.spin && 'animate-spin')} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
