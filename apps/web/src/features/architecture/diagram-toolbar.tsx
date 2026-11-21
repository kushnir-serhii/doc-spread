import type { ReactNode } from 'react'
import { Maximize, Minus, Plus, ScanSearch } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ToolButtonProps {
  label: string
  onClick: () => void
  children: ReactNode
}

const ToolButton = ({ label, onClick, children }: ToolButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button type="button" variant="outline" size="icon" className="size-touch" aria-label={label} onClick={onClick}>
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)

interface DiagramToolbarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  onActualSize: () => void
  /** The Fullscreen control; omitted inside the fullscreen dialog. */
  fullscreen?: ReactNode
}

export const DiagramToolbar = ({ zoom, onZoomIn, onZoomOut, onFit, onActualSize, fullscreen }: DiagramToolbarProps) => (
  <div role="toolbar" aria-label="Diagram view" className="flex flex-wrap items-center gap-2">
    <ToolButton label="Zoom in" onClick={onZoomIn}>
      <Plus />
    </ToolButton>
    <ToolButton label="Zoom out" onClick={onZoomOut}>
      <Minus />
    </ToolButton>
    <ToolButton label="Fit to view" onClick={onFit}>
      <Maximize />
    </ToolButton>
    <ToolButton label="Actual size (100%)" onClick={onActualSize}>
      <ScanSearch />
    </ToolButton>
    {fullscreen}
    <span aria-live="polite" className="min-w-12 text-sm font-medium text-muted-foreground tabular-nums">
      {Math.round(zoom * 100)}%
    </span>
  </div>
)
