import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { FieldValue } from '@/lib/mock/types'

const SAMPLES: { label: string; value: FieldValue | null }[] = [
  { label: 'Empty', value: null },
  { label: 'Money', value: { type: 'money', value: { amount: 1535040, currency: 'USD' }, confidence: 0.98 } },
  { label: 'Date', value: { type: 'date', value: '2026-10-22', confidence: 0.95 } },
  {
    label: 'Table',
    value: {
      type: 'table',
      rows: [
        { id: 'r1', cells: {} },
        { id: 'r2', cells: {} },
      ],
    },
  },
]

export const FieldTypesSection = () => {
  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(FIELD_TYPE_META).map(([type, meta]) => {
          const Icon = meta.icon
          return (
            <li key={type} className="flex min-h-touch items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">{meta.label}</span>
              {meta.groupable && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-foreground">
                  groupable
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <dl className="max-w-sm divide-y rounded-lg border text-sm">
        {SAMPLES.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="amount min-w-0 truncate font-medium">{formatFieldValue(s.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
