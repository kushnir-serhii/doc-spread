import {
  CircleCheck,
  CircleX,
  Eye,
  CircleQuestionMark,
  FileUp,
  LoaderCircle,
  OctagonAlert,
  Send,
  type LucideIcon,
} from 'lucide-react'
import type { DocumentStatus } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from './status-labels'

const STATUS_META: Record<DocumentStatus, { icon: LucideIcon; className: string; spin?: boolean }> = {
  uploaded: { icon: FileUp, className: 'bg-status-uploaded-bg text-status-uploaded-fg' },
  processing: {
    icon: LoaderCircle,
    className: 'bg-status-processing-bg text-status-processing-fg',
    spin: true,
  },
  unclassified: {
    icon: CircleQuestionMark,
    className: 'bg-status-unclassified-bg text-status-unclassified-fg',
  },
  needs_review: { icon: Eye, className: 'bg-status-needs-review-bg text-status-needs-review-fg' },
  approved: { icon: CircleCheck, className: 'bg-status-approved-bg text-status-approved-fg' },
  exported: { icon: Send, className: 'bg-status-exported-bg text-status-exported-fg' },
  rejected: { icon: CircleX, className: 'bg-status-rejected-bg text-status-rejected-fg' },
  error: {
    icon: OctagonAlert,
    className: 'bg-status-error-bg text-status-error-fg ring-1 ring-inset ring-status-error-dot/40',
  },
}

export interface StatusBadgeProps {
  status: DocumentStatus
  className?: string
}

/** Document status pill. Color is never the only cue: icon + label always present. */
export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
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
      {STATUS_LABELS[status]}
    </span>
  )
}
