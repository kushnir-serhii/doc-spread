import { GroupAmounts } from '@/features/groups/group-amounts'
import type { FieldDef, GroupValue } from '@/lib/mock/types'

interface GroupValueHeaderProps {
  group: GroupValue
  totalFields: FieldDef[]
}

/** The value as the page title, with the document count and the totals of the matching values row. */
export const GroupValueHeader = ({ group, totalFields }: GroupValueHeaderProps) => (
  <div className="mb-6 min-w-0">
    <h1 className="wrap-break-word text-2xl font-semibold tracking-tight">{group.value}</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      {group.count === 1 ? '1 document' : `${group.count} documents`}
    </p>
    {totalFields.length > 0 && (
      <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        {totalFields.map((field) => (
          <div key={field.id} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{field.label}</dt>
            <dd className="text-base font-medium">
              <GroupAmounts amounts={group.totals.find((total) => total.fieldId === field.id)?.amounts ?? []} />
            </dd>
          </div>
        ))}
      </dl>
    )}
  </div>
)
