import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UnreadableNoticeProps {
  onTryExample: () => void
}

export const UNREADABLE_MESSAGE =
  'This demo can’t read uploaded files yet — reading real files arrives with the backend.'

/** Says the mock can't read an uploaded file, and offers a document it can read. */
export const UnreadableNotice = ({ onTryExample }: UnreadableNoticeProps) => (
  <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm">
    <FileQuestion className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    <p className="min-w-0 flex-1">{UNREADABLE_MESSAGE}</p>
    <Button variant="outline" size="sm" className="min-h-touch md:min-h-9" onClick={onTryExample}>
      Try with an example document
    </Button>
  </div>
)
