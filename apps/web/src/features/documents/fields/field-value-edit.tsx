import type { FieldDef, FieldValue } from '@/lib/mock/types'
import { FIELD_REGISTRY } from './field-registry'

interface FieldValueEditProps {
  id: string
  field: FieldDef
  value: FieldValue
  onChange: (next: FieldValue) => void
}

/** Picks the registry editor for the value's type. The switch is what correlates a value with its component. */
export const FieldValueEdit = ({ id, field, value, onChange }: FieldValueEditProps) => {
  const props = { id, field, onChange }
  switch (value.type) {
    case 'text':
      return <FIELD_REGISTRY.text.Edit {...props} value={value} />
    case 'number':
      return <FIELD_REGISTRY.number.Edit {...props} value={value} />
    case 'money':
      return <FIELD_REGISTRY.money.Edit {...props} value={value} />
    case 'date':
      return <FIELD_REGISTRY.date.Edit {...props} value={value} />
    case 'boolean':
      return <FIELD_REGISTRY.boolean.Edit {...props} value={value} />
    case 'select':
      return <FIELD_REGISTRY.select.Edit {...props} value={value} />
    case 'email':
      return <FIELD_REGISTRY.email.Edit {...props} value={value} />
    case 'phone':
      return <FIELD_REGISTRY.phone.Edit {...props} value={value} />
    case 'tax_id':
      return <FIELD_REGISTRY.tax_id.Edit {...props} value={value} />
    case 'table':
      return <FIELD_REGISTRY.table.Edit {...props} value={value} />
    default: {
      const unreachable: never = value
      return unreachable
    }
  }
}
