import { Maximize2, Minus, Plus, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ViewerToolbarProps {
  percent: number
  fit: boolean
  canZoomOut: boolean
  canZoomIn: boolean
  onFit: () => void
  onActualSize: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onRotateAll: () => void
}

export const ViewerToolbar = ({
  percent,
  fit,
  canZoomOut,
  canZoomIn,
  onFit,
  onActualSize,
  onZoomOut,
  onZoomIn,
  onRotateAll,
}:ViewerToolbarProps) => (
  <div role="toolbar" aria-label="Document view" className="flex flex-wrap items-center gap-1 border-b bg-card p-1">
    <Button variant="ghost" size="icon" className="size-touch" aria-label="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
      <Minus aria-hidden="true" />
    </Button>
    <output aria-live="polite" className="amount min-w-12 text-center text-sm font-medium">
      {percent}%
    </output>
    <Button variant="ghost" size="icon" className="size-touch" aria-label="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
      <Plus aria-hidden="true" />
    </Button>
    <Button variant={fit ? 'secondary' : 'ghost'} className="min-h-touch" aria-pressed={fit} onClick={onFit}>
      <Maximize2 aria-hidden="true" /> Fit width
    </Button>
    <Button variant={!fit && percent === 100 ? 'secondary' : 'ghost'} className="min-h-touch" onClick={onActualSize}>
      100%
    </Button>
    <Button variant="ghost" className="min-h-touch" onClick={onRotateAll}>
      <RotateCw aria-hidden="true" /> Rotate all
    </Button>
  </div>
)
