import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Expand } from 'lucide-react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DiagramToolbar } from '@/features/architecture/diagram-toolbar'
import type { GlossaryKey } from '@/features/architecture/diagrams/glossary'
import { NodeTooltips } from '@/features/architecture/node-tooltip'
import { cn } from '@/lib/utils'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 4
const ZOOM_STEP = 0.5

interface DiagramViewportProps {
  svg: string
  label: string
  description: string
  /** Mermaid node id → glossary entry. */
  items: Record<string, GlossaryKey>
  /** True inside the fullscreen dialog: no Fullscreen button, the viewport fills the space. */
  inDialog?: boolean
}

export const DiagramViewport = ({ svg, label, description, items, inDialog = false }: DiagramViewportProps) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  // A diagram wider than the container may need to go below the usual minimum to fit.
  const [minZoom, setMinZoom] = useState(MIN_ZOOM)

  const place = useCallback((mode: 'fit' | 'actual') => {
    const instance = transformRef.current?.instance
    const wrapper = instance?.wrapperComponent
    const content = instance?.contentComponent
    if (!transformRef.current || !wrapper || !content) return
    const wrapperWidth = wrapper.clientWidth
    const wrapperHeight = wrapper.clientHeight
    const contentWidth = content.offsetWidth
    const contentHeight = content.offsetHeight
    if (!wrapperWidth || !contentWidth) return
    // Fit the whole diagram; one that already fits stays at 100%.
    const scale = mode === 'fit' ? Math.min(1, wrapperWidth / contentWidth, wrapperHeight / contentHeight) : 1
    setMinZoom(Math.min(MIN_ZOOM, scale))
    const x = (wrapperWidth - contentWidth * scale) / 2
    const y = Math.max(0, (wrapperHeight - contentHeight * scale) / 2)
    // Let the new minimum scale reach the library before the transform is applied.
    requestAnimationFrame(() => void transformRef.current?.setTransform(x, y, scale, 0))
  }, [])

  const fit = useCallback(() => place('fit'), [place])

  // Fit again when the container resizes or the theme redraws the SVG.
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fit])
  useEffect(() => {
    fit()
  }, [svg, fit])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === '+' || event.key === '=') void transformRef.current?.zoomIn(ZOOM_STEP)
    else if (event.key === '-') void transformRef.current?.zoomOut(ZOOM_STEP)
    else if (event.key === '0') fit()
    else return
    event.preventDefault()
  }

  return (
    <div className={cn('flex flex-col gap-3', inDialog && 'min-h-0 flex-1')}>
      <DiagramToolbar
        zoom={zoom}
        onZoomIn={() => void transformRef.current?.zoomIn(ZOOM_STEP)}
        onZoomOut={() => void transformRef.current?.zoomOut(ZOOM_STEP)}
        onFit={fit}
        onActualSize={() => place('actual')}
        fullscreen={
          inDialog ? undefined : <FullscreenControl svg={svg} label={label} description={description} items={items} />
        }
      />
      <div
        ref={viewportRef}
        role="group"
        aria-roledescription="diagram"
        aria-label={`${label}: ${description}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          'overflow-hidden rounded-lg border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring',
          inDialog ? 'min-h-0 flex-1' : 'h-[60dvh] min-h-80',
        )}
      >
        <TransformWrapper
          ref={transformRef}
          minScale={minZoom}
          maxScale={MAX_ZOOM}
          limitToBounds={false}
          doubleClick={{ disabled: true }}
          onTransform={(_ref, state) => setZoom(state.scale)}
        >
          <TransformComponent wrapperClass="!h-full !w-full" contentClass="cursor-grab active:cursor-grabbing">
            {/* The SVG string comes from Mermaid (securityLevel 'strict') for a constant definition
                in this repo, never from user input. Every color in it comes from the design tokens
                via mermaid-theme.ts. */}
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </TransformComponent>
        </TransformWrapper>
        <NodeTooltips containerRef={viewportRef} svg={svg} items={items} label={label} />
      </div>
    </div>
  )
}

const FullscreenControl = ({ svg, label, description, items }: Omit<DiagramViewportProps, 'inDialog'>) => {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="size-touch" aria-label="Fullscreen">
              <Expand />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Fullscreen</TooltipContent>
      </Tooltip>
      <DialogContent
        ref={contentRef}
        className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none p-4 sm:max-w-none"
        onOpenAutoFocus={(event) => {
          // Focus the diagram, not the first button: its tooltip would open and swallow the first Esc.
          event.preventDefault()
          contentRef.current?.querySelector<HTMLElement>('[role="group"]')?.focus()
        }}
      >
        <DialogTitle className="pr-10">{label}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <DiagramViewport svg={svg} label={label} description={description} items={items} inDialog />
      </DialogContent>
    </Dialog>
  )
}
