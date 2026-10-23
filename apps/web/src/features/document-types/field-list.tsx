import type { FieldDef } from '@/lib/mock/types'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'

interface FieldRowProps {
  field: Pick<FieldDef, 'key' | 'label' | 'type' | 'required'>
}

const FieldRow = ({ field }: FieldRowProps) => {
  const meta = FIELD_TYPE_META[field.type]
  const Icon = meta.icon
  return (
    <div className="flex min-h-touch items-center gap-3 px-4 py-2 md:min-h-12">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={field.label}>
          {field.label}
          {field.required && (
            <span className="ml-1 text-destructive" title="Required">
              *<span className="sr-only"> required</span>
            </span>
          )}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground" title={field.key}>
          {field.key}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{meta.label}</span>
    </div>
  )
}

interface FieldListProps {
  fields: FieldDef[]
}

export const FieldList = ({ fields }: FieldListProps) => {
  if (fields.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No fields yet.</p>
    )
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {fields.map((field) => (
        <li key={field.id}>
          <FieldRow field={field} />
          {field.columns && field.columns.length > 0 && (
            <ul className="ml-6 divide-y border-l border-t bg-muted/30" aria-label={`${field.label} columns`}>
              {field.columns.map((column) => (
                <li key={column.id}>
                  <FieldRow field={column} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
