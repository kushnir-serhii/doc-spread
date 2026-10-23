import { Link } from 'react-router'
import type { Document } from '@/lib/mock/types'

interface DocumentErrorPanelProps {
  doc: Document
}

/** status === 'error': what went wrong and the way back. */
export const DocumentErrorPanel = ({ doc }: DocumentErrorPanelProps) => (
  <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-destructive/40 p-6">
    <p className="font-medium">This document could not be processed</p>
    <p className="text-sm break-words text-muted-foreground">{doc.errorMessage ?? 'No details were given.'}</p>
    <Link
      to="/inbox"
      className="inline-flex min-h-touch items-center rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      Back to Inbox
    </Link>
  </div>
)
