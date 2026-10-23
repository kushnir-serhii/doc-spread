import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { FieldDef } from '@/lib/mock/types'

interface FieldSummaryProps {
  field: Pick<FieldDef, 'key' | 'label' | 'type' | 'required'>
}

export const FieldSummary = ({ field }: FieldSummaryProps) => {
  const meta = FIELD_TYPE_META[field.type]
  const Icon = meta.icon
  return (
    <>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium" title={field.label}>
          {field.label}
          {field.required && (
            <span className="ml-1 text-destructive" title="Required">
              *<span className="sr-only"> required</span>
            </span>
          )}
        </span>
        <span className="block truncate font-mono text-xs text-muted-foreground" title={field.key}>
          {field.key || 'no key'}
        </span>
      </span>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{meta.label}</span>
    </>
  )
}
