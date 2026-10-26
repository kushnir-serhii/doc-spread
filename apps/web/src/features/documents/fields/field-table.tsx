import type { TableValue } from '@/lib/mock/types'
import type { FieldViewProps } from './field-types'
import { TableFieldView } from './table-field-view'

/** Registry viewer: the shared table view, read-only. */
export const FieldTable = ({ field, value, focusId }: FieldViewProps<TableValue>) => (
  <TableFieldView label={field.label} columns={field.columns ?? []} value={value} focusId={focusId} />
)
