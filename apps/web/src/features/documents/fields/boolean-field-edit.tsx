import { Switch } from '@/components/ui/switch'
import type { ExtractedValue } from '@/lib/mock/types'
import type { FieldEditProps } from './field-types'

export const BooleanFieldEdit = ({ id, value, onChange }: FieldEditProps<ExtractedValue<'boolean'>>) => (
  <div className="flex min-h-touch items-center gap-3">
    <Switch id={id} checked={value.value === true} onCheckedChange={(checked) => onChange({ ...value, value: checked })} />
    <span className="text-sm" aria-hidden="true">
      {value.value === null ? 'Not set' : value.value ? 'Yes' : 'No'}
    </span>
  </div>
)
