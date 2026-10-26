import { findGroupValue } from '@/features/groups/find-group-value'
import { GroupValueDocuments } from '@/features/groups/group-value-documents'
import { GroupValueGone } from '@/features/groups/group-value-gone'
import { GroupValueHeader } from '@/features/groups/group-value-header'
import { totalFields } from '@/lib/fields/total-fields'
import type { DocumentType, GroupValue } from '@/lib/mock/types'

interface GroupValueViewProps {
  type: DocumentType
  fieldId: string
  /** rows of the values list: the single source of the header's count and totals */
  values: GroupValue[]
  /** the ?value= param */
  value: string
  valuesHref: string
}

/** One value of a grouping; the caller handles loading and error of the values query. */
export const GroupValueView = ({ type, fieldId, values, value, valuesHref }: GroupValueViewProps) => {
  const group = findGroupValue(values, value)
  if (!group) return <GroupValueGone value={value} valuesHref={valuesHref} />
  return (
    <>
      <GroupValueHeader group={group} totalFields={totalFields(type)} />
      <GroupValueDocuments type={type} fieldId={fieldId} value={value} valuesHref={valuesHref} />
    </>
  )
}
