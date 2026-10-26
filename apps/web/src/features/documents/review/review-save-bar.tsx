import { CircleCheck, LoaderCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReviewSaveBarProps {
  dirty: boolean
  isPending: boolean
  isSuccess: boolean
  errorMessage: string | null
  onSave: () => void
}

/** Save draft with its pending, success and error states. Stays in reach at the bottom of a long form. */
export const ReviewSaveBar = ({ dirty, isPending, isSuccess, errorMessage, onSave }: ReviewSaveBarProps) => (
  <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t bg-background py-3">
    <div className="flex flex-wrap items-center gap-3">
      <Button className="min-h-touch" disabled={!dirty || isPending} onClick={onSave}>
        {isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
        {isPending ? 'Saving…' : 'Save draft'}
      </Button>
      {!isPending && !errorMessage && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {isSuccess && (
            <>
              <CircleCheck className="size-4" aria-hidden="true" />
              Draft saved
            </>
          )}
          {!isSuccess && dirty && 'Unsaved changes'}
        </p>
      )}
    </div>
    {errorMessage && (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
        <p className="min-w-0 break-words">Could not save: {errorMessage}</p>
        <Button variant="outline" className="min-h-touch" onClick={onSave}>
          Retry
        </Button>
      </div>
    )}
  </div>
)
