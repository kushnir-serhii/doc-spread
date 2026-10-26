import { BooleanFieldEdit } from './boolean-field-edit'
import { DateInput } from './date-input'
import type { FieldRegistry } from './field-types'
import { FieldTable } from './field-table'
import { FieldTableEdit } from './field-table-edit'
import { MoneyInput } from './money-input'
import { NumberFieldEdit } from './number-field-edit'
import { ScalarView } from './scalar-view'
import { SelectFieldEdit } from './select-field-edit'
import { TextFieldEdit } from './text-field-edit'

/** One viewer and one editor per field type. Add a FieldType and this stops compiling until it has both. */
export const FIELD_REGISTRY: FieldRegistry = {
  text: { View: ScalarView, Edit: TextFieldEdit },
  number: { View: ScalarView, Edit: NumberFieldEdit },
  money: { View: ScalarView, Edit: MoneyInput },
  date: { View: ScalarView, Edit: DateInput },
  boolean: { View: ScalarView, Edit: BooleanFieldEdit },
  select: { View: ScalarView, Edit: SelectFieldEdit },
  email: { View: ScalarView, Edit: TextFieldEdit },
  phone: { View: ScalarView, Edit: TextFieldEdit },
  tax_id: { View: ScalarView, Edit: TextFieldEdit },
  table: { View: FieldTable, Edit: FieldTableEdit },
}
