import { PageHeader } from '@/components/layout/page-header'
import { GroupingCard } from '@/features/groups/grouping-card'
import { GroupingsEmptyState } from '@/features/groups/groupings-empty-state'
import { GroupingsError } from '@/features/groups/groupings-error'
import { GroupingsSkeleton } from '@/features/groups/groupings-skeleton'
import { useGroupings } from '@/lib/api'

const GroupsPage = () => {
  const query = useGroupings()
  const groupings = query.data ?? []

  return (
    <>
      <PageHeader title="Groups" description="Documents grouped by a field, like supplier or counterparty." />
      {query.isError ? (
        <GroupingsError onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <GroupingsSkeleton />
      ) : groupings.length === 0 ? (
        <GroupingsEmptyState />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {groupings.map((grouping) => (
            <li key={`${grouping.typeId}/${grouping.fieldId}`} className="min-w-0">
              <GroupingCard grouping={grouping} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default GroupsPage
