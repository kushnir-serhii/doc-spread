import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FIELD_TYPE_META } from '@/lib/fields/field-meta'
import type { PointAgain } from './use-point-again'

interface PointAgainFeedbackProps {
  fieldId: string
  pointAgain: PointAgain
}

/** Under a row: what to do while pointing, a type change on offer, why pointing failed, or an assumed part. */
export const PointAgainFeedback = ({ fieldId, pointAgain }: PointAgainFeedbackProps) => {
  const { state } = pointAgain
  if (state.step === 'idle' || state.fieldId !== fieldId) return null
  switch (state.step) {
    case 'pointing':
      return <p className="text-sm text-muted-foreground">Select the words in the document, then confirm.</p>
    case 'failed':
      return (
        <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {state.reason} The old value is kept.
        </p>
      )
    case 'warned':
      return (
        <p role="alert" className="flex items-start gap-1.5 rounded-md bg-warning-soft p-2 text-sm text-warning-soft-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.warning}
        </p>
      )
    case 'offer': {
      const to = FIELD_TYPE_META[state.to].label
      return (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-muted p-2 text-sm">
          <p>
            This looks like {to} — change the field to {to}?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="min-h-touch md:min-h-9" onClick={pointAgain.changeType}>
              Change type
            </Button>
            <Button size="sm" variant="ghost" className="min-h-touch md:min-h-9" onClick={pointAgain.cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}
