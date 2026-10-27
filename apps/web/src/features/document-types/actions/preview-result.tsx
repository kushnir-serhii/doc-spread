import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import { computeValues, runChecks } from '@/lib/fields/evaluate'
import { describeCheckError, describeCheckSides } from '@/lib/fields/describe-check-outcome'
import { describeFailure } from '@/lib/fields/describe-failure'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { Document, FieldAction, FieldDef } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

interface PreviewResultProps {
  /** the action as it is being edited */
  action: FieldAction
  document: Document
  fields: FieldDef[]
  /** the draft's actions with `action` in place of its saved version */
  actions: FieldAction[]
}

interface BoxProps {
  tone: 'ok' | 'bad' | 'neutral'
  title: string
  children: string
}

const Box = ({ tone, title, children }: BoxProps) => {
  const Icon = tone === 'ok' ? CircleCheck : tone === 'bad' ? CircleX : CircleAlert
  return (
    <div
      className={cn(
        'rounded-md border p-3 text-sm',
        tone === 'ok' && 'border-success bg-success-soft text-success-soft-foreground',
        tone === 'bad' && 'border-destructive',
        tone === 'neutral' && 'bg-warning-soft text-warning-soft-foreground',
      )}
    >
      <p className={cn('flex items-center gap-2 font-medium', tone === 'bad' && 'text-destructive')}>
        <Icon className="size-4 shrink-0" aria-hidden />
        {title}
      </p>
      <p className="mt-1 break-words tabular-nums">{children}</p>
    </div>
  )
}

/** The action evaluated on one document, using the draft's fields. */
export const PreviewResult = ({ action, document, fields, actions }: PreviewResultProps) => {
  const locale = useFormatLocale()
  const type = { fields, actions }
  if (action.kind === 'check') {
    const outcome = runChecks(type, document).find((o) => o.check.id === action.id)
    if (!outcome) return null
    if (outcome.status === 'error') {
      return (
        <Box tone="neutral" title="Can’t check">
          {describeCheckError(outcome, fields)}
        </Box>
      )
    }
    return (
      <Box tone={outcome.status === 'passed' ? 'ok' : 'bad'} title={outcome.status === 'passed' ? 'Passes' : 'Fails'}>
        {describeCheckSides(outcome, fields, locale)}
      </Box>
    )
  }

  const outcome = computeValues(type, document.values)[action.fieldId]
  const label = fields.find((f) => f.id === action.fieldId)?.label ?? 'Computed field'
  if (!outcome) return null
  if (!outcome.ok) {
    return (
      <Box tone="neutral" title="Can’t compute">
        {describeFailure(outcome.reason, outcome.fieldIds, fields)}
      </Box>
    )
  }
  return (
    <Box tone="ok" title="Computed">
      {`${label} = ${formatFieldValue(outcome.value, locale)}`}
    </Box>
  )
}
