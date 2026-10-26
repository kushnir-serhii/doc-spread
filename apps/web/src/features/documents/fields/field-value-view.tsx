import type { FieldDef, FieldValue } from '@/lib/mock/types'
import { FIELD_REGISTRY } from './field-registry'

interface FieldValueViewProps {
  field: FieldDef
  value: FieldValue
  focusId: string
}

/** Picks the registry viewer for the value's type. The switch is what correlates a value with its component. */
export const FieldValueView = ({ field, value, focusId }: FieldValueViewProps) => {
  const props = { field, focusId }
  switch (value.type) {
    case 'text':
      return <FIELD_REGISTRY.text.View {...props} value={value} />
    case 'number':
      return <FIELD_REGISTRY.number.View {...props} value={value} />
    case 'money':
      return <FIELD_REGISTRY.money.View {...props} value={value} />
    case 'date':
      return <FIELD_REGISTRY.date.View {...props} value={value} />
    case 'boolean':
      return <FIELD_REGISTRY.boolean.View {...props} value={value} />
    case 'select':
      return <FIELD_REGISTRY.select.View {...props} value={value} />
    case 'email':
      return <FIELD_REGISTRY.email.View {...props} value={value} />
    case 'phone':
      return <FIELD_REGISTRY.phone.View {...props} value={value} />
    case 'tax_id':
      return <FIELD_REGISTRY.tax_id.View {...props} value={value} />
    case 'table':
      return <FIELD_REGISTRY.table.View {...props} value={value} />
    default: {
      const unreachable: never = value
      return unreachable
    }
  }
}
