import { Crosshair, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PointAgain } from './use-point-again'

interface PointAgainButtonProps {
  fieldId: string
  name: string
  pointAgain: PointAgain
}

/** Starts pointing again for one field; while pointing it cancels. */
export const PointAgainButton = ({ fieldId, name, pointAgain }: PointAgainButtonProps) => {
  const active = pointAgain.state.step === 'pointing' && pointAgain.state.fieldId === fieldId
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={active ? 'secondary' : 'outline'}
          className="size-touch md:size-9"
          data-point-again={fieldId}
          aria-pressed={active}
          aria-label={active ? `Cancel pointing for ${name}` : `Point again for ${name}`}
          onClick={active ? pointAgain.cancel : () => pointAgain.start(fieldId)}
        >
          {active ? <X aria-hidden /> : <Crosshair aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{active ? 'Cancel pointing' : 'Point again'}</TooltipContent>
    </Tooltip>
  )
}
