import { Crosshair, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ReviewPointing } from './use-review-pointing'

interface ReviewPointButtonProps {
  fieldId: string
  label: string
  pointing: ReviewPointing
}

/** Starts (or cancels) pointing at the document for one field: an icon beside the input, words while active. */
export const ReviewPointButton = ({ fieldId, label, pointing }: ReviewPointButtonProps) => {
  const active = pointing.state.step === 'pointing' && pointing.state.fieldId === fieldId
  if (active) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-touch shrink-0"
        data-point-id={fieldId}
        aria-pressed
        aria-label={`Cancel pointing for ${label}`}
        onClick={pointing.cancel}
      >
        <X aria-hidden="true" />
        Cancel pointing
      </Button>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-touch shrink-0"
          data-point-id={fieldId}
          aria-pressed={false}
          aria-keyshortcuts="P"
          aria-label={`Point on document for ${label}`}
          onClick={() => pointing.start(fieldId)}
        >
          <Crosshair aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Point on document (P)</TooltipContent>
    </Tooltip>
  )
}
