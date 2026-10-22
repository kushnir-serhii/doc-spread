import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ViewerMode, ViewerSelection } from './viewer-types'

interface PointingHintBarProps {
  mode: ViewerMode
  selection: ViewerSelection | null
  /** a selection can be confirmed once the pointer is released */
  canConfirm: boolean
  onConfirm: () => void
  onCancel: () => void
}

const HINTS: Record<Exclude<ViewerMode, 'view'>, string> = {
  'select-words':
    'Click a word, drag or Shift+click to extend. Keyboard: Tab to a page, arrows, Shift+arrows. Enter to confirm, Esc to cancel.',
  'select-region': 'Drag a rectangle around the area. Esc to cancel. Needs a pointer, no keyboard alternative here.',
}

export const PointingHintBar = ({ mode, selection, canConfirm, onConfirm, onCancel }: PointingHintBarProps) => {
  if (mode === 'view') return null
  const pending = selection ? selection.text || 'Region without words' : null
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-secondary p-2 text-sm">
      <p className="min-w-0 flex-1 basis-60">
        <span className="font-medium">{mode === 'select-words' ? 'Select words.' : 'Select region.'}</span>{' '}
        <span className="text-muted-foreground">{HINTS[mode]}</span>
      </p>
      {pending && (
        <p className="max-w-full min-w-0 truncate font-medium" title={pending}>
          {pending}
        </p>
      )}
      <div className="flex gap-2">
        <Button className="min-h-touch" disabled={!canConfirm} onClick={onConfirm}>
          <Check aria-hidden="true" /> Confirm
        </Button>
        <Button variant="outline" className="min-h-touch" disabled={!selection} onClick={onCancel}>
          <X aria-hidden="true" /> Cancel
        </Button>
      </div>
    </div>
  )
}
