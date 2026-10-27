import { computeValues, runChecks, runRowChecksOnDocument } from '@/lib/fields/run-checks'
import { describeCheckError, describeCheckSides } from '@/lib/fields/describe-check-outcome'
import { describeFailure } from '@/lib/fields/describe-failure'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { Document, FieldAction, FieldDef } from '@/lib/mock/types'
import { PreviewBox } from './preview-box'
import { RowCheckPreview } from './row-check-preview'
import { RowComputePreview } from './row-compute-preview'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

interface PreviewResultProps {
  /** the action as it is being edited */
  action: FieldAction
  document: Document
  fields: FieldDef[]
  /** the draft's actions with `action` in place of its saved version */
  actions: FieldAction[]
}

/** The action evaluated on one document, using the draft's fields. */
export const PreviewResult = ({ action, document, fields, actions }: PreviewResultProps) => {
  const locale = useFormatLocale()
  const type = { fields, actions }
  switch (action.kind) {
    case 'check': {
      const outcome = runChecks(type, document).find((o) => o.check.id === action.id)
      if (!outcome) return null
      if (outcome.status === 'error') {
        return (
          <PreviewBox tone="neutral" title="Can’t check">
            {describeCheckError(outcome, fields)}
          </PreviewBox>
        )
      }
      return (
        <PreviewBox
          tone={outcome.status === 'passed' ? 'ok' : 'bad'}
          title={outcome.status === 'passed' ? 'Passes' : 'Fails'}
        >
          {describeCheckSides(outcome, fields, locale)}
        </PreviewBox>
      )
    }
    case 'row_check': {
      const outcome = runRowChecksOnDocument(type, document).find((o) => o.check.id === action.id)
      return outcome ? <RowCheckPreview outcome={outcome} fields={fields} /> : null
    }
    case 'row_compute':
      return <RowComputePreview action={action} document={document} fields={fields} actions={actions} />
    case 'compute': {
      const outcome = computeValues(type, document.values)[action.fieldId]
      const label = fields.find((f) => f.id === action.fieldId)?.label ?? 'Computed field'
      if (!outcome) return null
      if (!outcome.ok) {
        return (
          <PreviewBox tone="neutral" title="Can’t compute">
            {describeFailure(outcome.reason, outcome.fieldIds, fields)}
          </PreviewBox>
        )
      }
      return (
        <PreviewBox tone="ok" title="Computed">
          {`${label} = ${formatFieldValue(outcome.value, locale)}`}
        </PreviewBox>
      )
    }
    default: {
      const unreachable: never = action
      throw new Error(`Unknown action: ${String(unreachable)}`)
    }
  }
}
