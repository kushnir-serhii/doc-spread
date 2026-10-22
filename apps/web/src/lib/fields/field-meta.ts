import {
  Banknote,
  Calendar,
  Hash,
  IdCard,
  List,
  Mail,
  Phone,
  Table,
  ToggleLeft,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { FieldType, FieldValue } from '@/lib/mock/types'

export interface FieldTypeMeta {
  label: string
  icon: LucideIcon
  groupable: boolean
  /** a fresh blank value of this type */
  empty: () => FieldValue
}

export const FIELD_TYPE_META: Record<FieldType, FieldTypeMeta> = {
  text: {
    label: 'Text',
    icon: Type,
    groupable: true,
    empty: () => ({ type: 'text', value: null, confidence: 0 }),
  },
  number: {
    label: 'Number',
    icon: Hash,
    groupable: false,
    empty: () => ({ type: 'number', value: null, confidence: 0 }),
  },
  money: {
    label: 'Money',
    icon: Banknote,
    groupable: false,
    empty: () => ({ type: 'money', value: null, confidence: 0 }),
  },
  date: {
    label: 'Date',
    icon: Calendar,
    groupable: false,
    empty: () => ({ type: 'date', value: null, confidence: 0 }),
  },
  boolean: {
    label: 'Yes / No',
    icon: ToggleLeft,
    groupable: false,
    empty: () => ({ type: 'boolean', value: null, confidence: 0 }),
  },
  select: {
    label: 'Select',
    icon: List,
    groupable: true,
    empty: () => ({ type: 'select', value: null, confidence: 0 }),
  },
  email: {
    label: 'Email',
    icon: Mail,
    groupable: true,
    empty: () => ({ type: 'email', value: null, confidence: 0 }),
  },
  phone: {
    label: 'Phone',
    icon: Phone,
    groupable: true,
    empty: () => ({ type: 'phone', value: null, confidence: 0 }),
  },
  tax_id: {
    label: 'Tax ID',
    icon: IdCard,
    groupable: true,
    empty: () => ({ type: 'tax_id', value: null, confidence: 0 }),
  },
  table: {
    label: 'Table',
    icon: Table,
    groupable: false,
    empty: () => ({ type: 'table', rows: [] }),
  },
}
