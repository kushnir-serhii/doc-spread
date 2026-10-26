import { Crosshair, X } from 'lucide-react'
import type { Ref } from 'react'
import { Button } from '@/components/ui/button'

interface PointButtonProps {
  pointing: boolean
  onToggle: () => void
  ref?: Ref<HTMLButtonElement>
}

/** Starts pointing on the viewer; while pointing it cancels. */
export const PointButton = ({ pointing, onToggle, ref }: PointButtonProps) => (
  <Button
    ref={ref}
    variant={pointing ? 'secondary' : 'outline'}
    size="sm"
    aria-pressed={pointing}
    onClick={onToggle}
    className="min-h-touch md:min-h-9"
  >
    {pointing ? <X aria-hidden /> : <Crosshair aria-hidden />}
    {pointing ? 'Cancel pointing' : 'Point to add'}
  </Button>
)
