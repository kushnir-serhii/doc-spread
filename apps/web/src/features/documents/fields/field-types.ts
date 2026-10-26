import type { ComponentType } from 'react'
import type { FieldDef, FieldType, FieldValue } from '@/lib/mock/types'

export interface FieldViewProps<V extends FieldValue> {
  field: FieldDef
  value: V
  /** id of the field's box in the viewer (see field-focus-ids.ts) */
  focusId: string
}

export interface FieldEditProps<V extends FieldValue> {
  /** for the `<Label htmlFor>` of the input */
  id: string
  field: FieldDef
  value: V
  onChange: (next: V) => void
}

export interface FieldRenderer<V extends FieldValue> {
  View: ComponentType<FieldViewProps<V>>
  Edit: ComponentType<FieldEditProps<V>>
}

export type FieldRegistry = { [K in FieldType]: FieldRenderer<Extract<FieldValue, { type: K }>> }
