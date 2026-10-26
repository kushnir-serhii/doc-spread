import type { TableValue } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'
import { TableFieldView } from './table-field-view'

/**
 * Registry editor: the shared table view, editable. The registry contract has no viewer box id, so cells are keyed by
 * the input id; a screen that points cells at the document renders `TableFieldView` itself with the real `focusId`.
 */
export const FieldTableEdit = ({ id, field, value, onChange }: FieldEditProps<TableValue>) => (
  <TableFieldView label={field.label} columns={field.columns ?? []} value={value} focusId={id} onChange={onChange} />
)
