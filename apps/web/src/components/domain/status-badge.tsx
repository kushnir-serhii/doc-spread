import {
  CircleCheck,
  CircleX,
  Eye,
  FileUp,
  LoaderCircle,
  OctagonAlert,
  Send,
  type LucideIcon,
} from 'lucide-react'
import type { InvoiceStatus } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

const STATUS_META: Record<InvoiceStatus, { label: string; icon: LucideIcon; className: string; spin?: boolean }> = {
  uploaded: { label: 'Uploaded', icon: FileUp, className: 'bg-status-uploaded-bg text-status-uploaded-fg' },
  processing: {
    label: 'Processing',
    icon: LoaderCircle,
    className: 'bg-status-processing-bg text-status-processing-fg',
    spin: true,
  },
  needs_review: { label: 'Needs review', icon: Eye, className: 'bg-status-needs-review-bg text-status-needs-review-fg' },
  approved: { label: 'Approved', icon: CircleCheck, className: 'bg-status-approved-bg text-status-approved-fg' },
  exported: { label: 'Exported', icon: Send, className: 'bg-status-exported-bg text-status-exported-fg' },
  rejected: { label: 'Rejected', icon: CircleX, className: 'bg-status-rejected-bg text-status-rejected-fg' },
  error: {
    label: 'Error',
    icon: OctagonAlert,
    className: 'bg-status-error-bg text-status-error-fg ring-1 ring-inset ring-status-error-dot/40',
  },
}

export interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

/** Invoice status pill. Color is never the only cue: icon + label always present. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        meta.className,
        className,
      )}
    >
      <Icon className={cn('size-3.5 shrink-0', meta.spin && 'animate-spin')} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
