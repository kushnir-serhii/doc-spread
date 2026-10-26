import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { GroupingSummary } from '@/lib/mock/types'

interface GroupingCardProps {
  grouping: GroupingSummary
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const GroupingCard = ({ grouping }: GroupingCardProps) => {
  const { typeId, typeName, fieldId, fieldLabel, valueCount, documentCount } = grouping
  return (
    <Link
      to={`/groups/${typeId}/${fieldId}`}
      className="group flex min-h-touch items-center gap-3 rounded-lg border bg-card p-4 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={fieldLabel}>
          {fieldLabel}
        </p>
        <p className="truncate text-sm text-muted-foreground" title={typeName}>
          {typeName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {valueCount === 0
            ? 'No values yet'
            : `${plural(valueCount, 'value', 'values')} · ${plural(documentCount, 'document', 'documents')}`}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
    </Link>
  )
}
