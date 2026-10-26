import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { GroupAmounts } from '@/features/groups/group-amounts'
import { formatDate } from '@/lib/mock/format'
import type { FieldDef, GroupValue } from '@/lib/mock/types'

interface GroupValueCardsProps {
  values: GroupValue[]
  totalFields: FieldDef[]
  hrefFor: (value: string) => string
}

export const GroupValueCards = ({ values, totalFields, hrefFor }: GroupValueCardsProps) => (
  <ul className="grid gap-2 md:hidden">
    {values.map((group) => (
      <li key={group.value} className="min-w-0">
        <Link
          to={hrefFor(group.value)}
          className="group flex min-h-touch items-center gap-3 rounded-lg border bg-card p-4 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium" title={group.value}>
              {group.value}
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {group.count === 1 ? '1 document' : `${group.count} documents`} · Last {formatDate(group.lastDocumentAt)}
            </p>
            {totalFields.length > 0 && (
              <dl className="mt-2 grid gap-1 text-sm">
                {totalFields.map((field) => (
                  <div key={field.id} className="flex items-start justify-between gap-3">
                    <dt className="min-w-0 truncate text-muted-foreground" title={field.label}>
                      {field.label}
                    </dt>
                    <dd className="shrink-0 text-right">
                      <GroupAmounts
                        amounts={group.totals.find((total) => total.fieldId === field.id)?.amounts ?? []}
                        className="items-end"
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
        </Link>
      </li>
    ))}
  </ul>
)
