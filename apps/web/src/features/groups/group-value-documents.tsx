import { DocumentTableError } from '@/features/documents/document-table-error'
import { DocumentTableSkeleton } from '@/features/documents/document-table-skeleton'
import { typeColumns } from '@/features/documents/document-columns'
import { InboxResults } from '@/features/documents/inbox-results'
import { GroupValueGone } from '@/features/groups/group-value-gone'
import { useDocuments } from '@/lib/api'
import type { DocumentType } from '@/lib/mock/types'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

interface GroupValueDocumentsProps {
  type: DocumentType
  fieldId: string
  /** the ?value= param; the mock normalizes it */
  value: string
  valuesHref: string
}

/** Documents of one value, with selection, bulk Approve and Export. Mount only for a value that has a row. */
export const GroupValueDocuments = ({ type, fieldId, value, valuesHref }: GroupValueDocumentsProps) => {
  const locale = useFormatLocale()
  const query = useDocuments({ typeId: type.id, group: { fieldId, value } })
  if (query.isError) return <DocumentTableError onRetry={() => void query.refetch()} />
  if (query.isPending) return <DocumentTableSkeleton />
  if (query.data.length === 0) return <GroupValueGone value={value} valuesHref={valuesHref} />
  return (
    <InboxResults
      key={value}
      documents={query.data}
      types={[type]}
      columns={typeColumns(type, locale)}
      exportTypeId={type.id}
    />
  )
}
