import { STATUS_LABELS } from '@/components/domain/status-labels'
import type { Document } from '@/lib/mock/types'

interface ReviewNoticeProps {
  doc: Document
}

/** Why the form is read-only. Nothing for a document that still needs review. */
export const ReviewNotice = ({ doc }: ReviewNoticeProps) => {
  if (doc.status === 'rejected') {
    return (
      <div className="rounded-md border bg-card p-3 text-sm">
        <p className="font-medium">Rejected: values are read-only</p>
        <p className="mt-1 break-words text-muted-foreground">{doc.rejectionReason ?? 'No reason was given.'}</p>
      </div>
    )
  }
  if (doc.status === 'approved' || doc.status === 'exported') {
    return (
      <p className="rounded-md border bg-card p-3 text-sm">
        {STATUS_LABELS[doc.status]}: values are read-only.
      </p>
    )
  }
  return null
}
