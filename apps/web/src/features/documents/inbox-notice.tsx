import { X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { readReviewNotice } from './review/review-done'

/** A dismissible message carried here by navigation (e.g. the review queue is empty). */
export const InboxNotice = () => {
  const notice = readReviewNotice(useLocation().state)
  const [dismissed, setDismissed] = useState<string | null>(null)
  if (notice === null || dismissed === notice) return null
  return (
    <div role="status" className="flex items-center justify-between gap-2 rounded-md border bg-card py-1 pl-3 pr-1 text-sm">
      <p className="min-w-0 break-words">{notice}</p>
      <Button variant="ghost" size="icon" className="size-touch shrink-0" aria-label="Dismiss message" onClick={() => setDismissed(notice)}>
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
