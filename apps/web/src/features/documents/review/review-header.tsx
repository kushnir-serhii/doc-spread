import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/domain/status-badge'
import type { Document } from '@/lib/mock/types'
import { ChangeTypeControl } from './change-type-control'

interface ReviewHeaderProps {
  doc: Document
  /** null while the type loads or when the document has none */
  typeName: string | null
}

export const ReviewHeader = ({ doc, typeName }: ReviewHeaderProps) => (
  <header className="flex flex-col gap-2">
    <Link
      to="/inbox"
      className="inline-flex min-h-touch w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Inbox
    </Link>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight" title={doc.file.name}>
        {doc.file.name}
      </h1>
      <StatusBadge status={doc.status} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p className="text-sm text-muted-foreground">
        <span className="sr-only">Type: </span>
        {/* a typed document whose type is still loading shows nothing rather than "No type yet" */}
        {typeName ?? (doc.typeId === null ? 'No type yet' : ' ')}
      </p>
      {doc.status === 'needs_review' && doc.typeId !== null && <ChangeTypeControl doc={doc} />}
    </div>
  </header>
)
