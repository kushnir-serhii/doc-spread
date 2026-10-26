import { Maximize2, Minus, Plus, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

/** A size container: in a narrow column "Fit width" and "Rotate all" turn icon-only, so it stays on one line. */
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
}: ViewerToolbarProps) => (
  <div role="toolbar" aria-label="Document view" className="@container border-b bg-card p-1">
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="size-touch" aria-label="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
        <Minus aria-hidden="true" />
      </Button>
      <output aria-live="polite" className="amount min-w-12 text-center text-sm font-medium">
        {percent}%
      </output>
      <Button variant="ghost" size="icon" className="size-touch" aria-label="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
        <Plus aria-hidden="true" />
      </Button>
      <Button
        variant={fit ? 'secondary' : 'ghost'}
        className="min-h-touch @max-md:size-touch @max-md:p-0"
        aria-label="Fit width"
        aria-pressed={fit}
        onClick={onFit}
      >
        <Maximize2 aria-hidden="true" /> <span className="hidden @md:inline">Fit width</span>
      </Button>
      <Button variant={!fit && percent === 100 ? 'secondary' : 'ghost'} className="min-h-touch" onClick={onActualSize}>
        100%
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="min-h-touch @max-md:size-touch @max-md:p-0"
            aria-label="Rotate all pages"
            onClick={onRotateAll}
          >
            <RotateCw aria-hidden="true" /> <span className="hidden @md:inline">Rotate all</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Rotate all</TooltipContent>
      </Tooltip>
    </div>
  </div>
)
