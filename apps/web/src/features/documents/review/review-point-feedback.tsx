import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReviewPointing } from './use-review-pointing'

interface ReviewPointFeedbackProps {
  fieldId: string
  pointing: ReviewPointing
}

/** Under a field: why pointing failed, or the non-blocking "use as example" question. */
export const ReviewPointFeedback = ({ fieldId, pointing }: ReviewPointFeedbackProps) => {
  const { state } = pointing
  if (state.step === 'pointing' && state.fieldId === fieldId) {
    return <p className="text-sm text-muted-foreground">Select the words in the document, then confirm.</p>
  }
  if (state.step === 'failed' && state.fieldId === fieldId) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
        <p>{state.reason} The old value is kept.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-touch bg-card" onClick={() => pointing.start(fieldId)}>
            Try again
          </Button>
          <Button type="button" variant="ghost" className="min-h-touch" onClick={pointing.dismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }
  if (state.step === 'fixed' && state.fieldId === fieldId) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-muted p-2 text-sm">
        {state.warning && (
          <p role="alert" className="flex items-start gap-1.5 rounded-sm bg-warning-soft p-2 text-warning-soft-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {state.warning}
          </p>
        )}
        <p>Use this as an example for {pointing.typeName}?</p>
        {pointing.exampleError !== null && (
          <p role="alert" className="text-destructive">
            The example could not be added: {pointing.exampleError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-touch" disabled={pointing.examplePending} onClick={pointing.submitExample}>
            {pointing.examplePending ? 'Adding…' : 'Add example'}
          </Button>
          <Button type="button" variant="ghost" className="min-h-touch" onClick={pointing.dismiss}>
            Not now
          </Button>
        </div>
      </div>
    )
  }
  return null
}
