import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate } from '@/lib/mock/format'
import type { DocumentType } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

interface TypeRowProps {
  type: DocumentType
  documentCount: number
  reviewCount: number
}

export const TypeRow = ({ type, documentCount, reviewCount }: TypeRowProps) => {
  const locale = useFormatLocale()
  return (
    <Link
      to={`/types/${type.id}`}
      className="group flex min-h-touch items-center gap-3 rounded-lg border bg-card p-4 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={type.name}>
          {type.name}
        </p>
        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
          <div>
            <dt className="sr-only">Fields</dt>
            <dd>{type.fields.length} fields</dd>
          </div>
          <div>
            <dt className="sr-only">Documents</dt>
            <dd>{documentCount} documents</dd>
          </div>
          <div>
            <dt className="sr-only">Needing review</dt>
            <dd className={cn(reviewCount > 0 && 'font-medium text-foreground')}>{reviewCount} to review</dd>
          </div>
          <div className="flex gap-1">
            <dt>Updated</dt>
            <dd>{formatDate(type.updatedAt, locale)}</dd>
          </div>
        </dl>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
    </Link>
  )
}
