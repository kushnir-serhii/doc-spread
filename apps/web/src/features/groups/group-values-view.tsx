import { InboxSearch } from '@/features/documents/inbox-search'
import { GroupValueCards } from '@/features/groups/group-value-cards'
import { GroupValuesNoResults } from '@/features/groups/group-values-no-results'
import { GroupValuesTable } from '@/features/groups/group-values-table'
import type { FieldDef, GroupValue } from '@/lib/mock/types'

interface GroupValuesViewProps {
  /** sorted by count, descending */
  values: GroupValue[]
  totalFields: FieldDef[]
  /** the committed ?q= value */
  search: string
  onSearchCommit: (value: string) => void
  hrefFor: (value: string) => string
}

const matches = (value: string, search: string) => value.toLowerCase().includes(search.toLowerCase())

/** Search plus the values of a grouping; the caller handles loading, error and "no documents at all". */
export const GroupValuesView = ({ values, totalFields, search, onSearchCommit, hrefFor }: GroupValuesViewProps) => {
  const shown = search ? values.filter((group) => matches(group.value, search)) : values
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <InboxSearch value={search} onCommit={onSearchCommit} label="Search values" placeholder="Value" />
        <p role="status" className="flex min-h-touch items-center text-sm text-muted-foreground sm:ml-auto">
          {shown.length === 1 ? '1 value' : `${shown.length} values`}
        </p>
      </div>
      {shown.length === 0 ? (
        <GroupValuesNoResults onClear={() => onSearchCommit('')} />
      ) : (
        <>
          <GroupValuesTable values={shown} totalFields={totalFields} hrefFor={hrefFor} />
          <GroupValueCards values={shown} totalFields={totalFields} hrefFor={hrefFor} />
        </>
      )}
    </>
  )
}
