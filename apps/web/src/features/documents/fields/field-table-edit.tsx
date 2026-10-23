import type { TableValue } from '@/lib/mock/types'
import { FieldTable } from './field-table'
import type { FieldEditProps } from './field-types'

/** Slice 4 adds adding, editing and removing rows; until then the editor shows the read-only table. */
export const FieldTableEdit = ({ id, field, value }: FieldEditProps<TableValue>) => (
  <FieldTable field={field} value={value} focusId={id} />
)
