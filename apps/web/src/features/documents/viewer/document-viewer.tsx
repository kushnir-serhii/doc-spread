import { useCallback, useImperativeHandle, useState, type ReactNode, type Ref } from 'react'
import { Button } from '@/components/ui/button'
import { useDocumentPages } from '@/lib/api'
import { useElementWidth } from './use-element-width'
import { useVisiblePages } from './use-visible-pages'
import { bboxToView, nextRotation, rotatedSize, type ViewRotation } from './rotation'
import { PointingHintBar } from './pointing-hint-bar'
import { usePointing } from './use-pointing'
import { ViewerPage } from './viewer-page'
import { ViewerToolbar } from './viewer-toolbar'
import type { DocumentViewerHandle, ViewerHighlight } from './viewer-highlights'
import type { ViewerFile, ViewerMode, ViewerSelection, ViewerZoom } from './viewer-types'

interface DocumentViewerProps {
  documentId: string
  file: ViewerFile
  /** draw faint OCR token outlines (demo / debug aid) */
  showTokens?: boolean
  highlights?: ViewerHighlight[]
  activeHighlightId?: string | null
  onHighlightClick?: (id: string) => void
  /** view: no pointing; select-words / select-region: a pending selection until confirmed */
  mode?: ViewerMode
  onSelect?: (s: ViewerSelection) => void
  onCancel?: () => void
  ref?: Ref<DocumentViewerHandle>
}

const NO_HIGHLIGHTS: ViewerHighlight[] = []

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const PAGE_PADDING = 32 // px: page-list padding (p-4 on both sides), subtracted for fit width

const Message = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">{children}</div>
)

export const DocumentViewer = ({
  documentId,
  file,
  showTokens = false,
  highlights = NO_HIGHLIGHTS,
  activeHighlightId,
  onHighlightClick,
  mode = 'view',
  onSelect,
  onCancel,
  ref,
}: DocumentViewerProps) => {
  const pagesQuery = useDocumentPages(documentId)
  const pages = pagesQuery.data
  const [zoom, setZoom] = useState<ViewerZoom>({ mode: 'fit' })
  // view-only rotation per page, kept above virtualization; tied to the document so it resets when that changes
  const [rotationState, setRotationState] = useState<{ documentId: string; byPage: Record<number, ViewRotation> }>({
    documentId,
    byPage: {},
  })
  const rotations = rotationState.documentId === documentId ? rotationState.byPage : {}
  const rotationOf = (index: number): ViewRotation => rotations[index] ?? 0
  const rotatePages = (indexes: number[]) => {
    const byPage = { ...rotations }
    for (const i of indexes) byPage[i] = nextRotation(rotationOf(i))
    setRotationState({ documentId, byPage })
  }
  const pointing = usePointing({ mode, pages: pages ?? [], rotationOf, onSelect, onCancel })
  const { containerRef, visible } = useVisiblePages(pages?.length ?? 0)
  const containerWidth = useElementWidth(containerRef)
  // set by scrollToHighlight; the box takes focus when it mounts, then clears it
  const [focusHighlightId, setFocusHighlightId] = useState<string | null>(null)
  const clearFocusRequest = useCallback(() => setFocusHighlightId(null), [])

  useImperativeHandle(ref, () => ({
    scrollToHighlight: (id) => {
      const target = highlights.find((h) => h.id === id)
      const container = containerRef.current
      const pageEl = container?.querySelector<HTMLElement>(`[data-page-index="${target?.page}"]`)
      if (!target || !container || !pageEl) return
      // the box in view coordinates (after the view rotation), then centre it in the scroll container
      const view = bboxToView(target.bbox, rotationOf(target.page))
      const containerRect = container.getBoundingClientRect()
      const pageRect = pageEl.getBoundingClientRect()
      const centerX = pageRect.left - containerRect.left + container.scrollLeft + (view.x + view.w / 2) * pageRect.width
      const centerY = pageRect.top - containerRect.top + container.scrollTop + (view.y + view.h / 2) * pageRect.height
      container.scrollTo({ left: centerX - container.clientWidth / 2, top: centerY - container.clientHeight / 2 })
      setFocusHighlightId(id)
    },
  }))

  // the widest page after rotation sets fit width, so nothing overflows sideways
  const widest = Math.max(1, ...(pages ?? []).map((p) => rotatedSize(p.width, p.height, rotationOf(p.index)).width))
  const fitScale = Math.max(containerWidth - PAGE_PADDING, 0) / widest
  const scale = zoom.mode === 'fit' ? fitScale : zoom.value
  const percent = Math.round(scale * 100)

  const stepZoom = (direction: 1 | -1) => {
    const next =
      direction === 1 ? ZOOM_STEPS.find((s) => s > scale + 0.001) : [...ZOOM_STEPS].reverse().find((s) => s < scale - 0.001)
    if (next) setZoom({ mode: 'scale', value: next })
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-muted">
      <ViewerToolbar
        percent={percent}
        fit={zoom.mode === 'fit'}
        canZoomOut={scale > ZOOM_STEPS[0] + 0.001}
        canZoomIn={scale < ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.001}
        onFit={() => setZoom({ mode: 'fit' })}
        onActualSize={() => setZoom({ mode: 'scale', value: 1 })}
        onZoomOut={() => stepZoom(-1)}
        onZoomIn={() => stepZoom(1)}
        onRotateAll={() => rotatePages((pages ?? []).map((p) => p.index))}
      />
      <PointingHintBar
        mode={mode}
        selection={pointing.selection}
        canConfirm={pointing.state.step === 'pending'}
        onConfirm={pointing.actions.confirm}
        onCancel={pointing.actions.cancel}
      />
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col overflow-auto">
        {pagesQuery.isPending ? (
          <div className="flex flex-col items-center gap-4 p-4" role="status" aria-label="Loading pages">
            {[0, 1].map((n) => (
              <div key={n} className="aspect-[1/1.414] w-full max-w-xl animate-pulse bg-card" />
            ))}
          </div>
        ) : pagesQuery.isError ? (
          <Message>
            <p role="alert">The pages could not be loaded.</p>
            <Button variant="outline" className="min-h-touch" onClick={() => void pagesQuery.refetch()}>
              Retry
            </Button>
          </Message>
        ) : pagesQuery.data.length === 0 ? (
          <Message>
            <p className="font-medium">This document has no pages.</p>
            <p className="text-muted-foreground">Nothing to show yet. Pages appear once the file is processed.</p>
          </Message>
        ) : (
          <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4 p-4">
            {pagesQuery.data.map((page) => (
              <ViewerPage
                key={page.index}
                page={page}
                file={file}
                scale={scale}
                visible={visible.has(page.index)}
                rotation={rotationOf(page.index)}
                showTokens={showTokens}
                highlights={highlights.filter((h) => h.page === page.index)}
                activeHighlightId={activeHighlightId}
                focusHighlightId={focusHighlightId}
                onHighlightFocused={clearFocusRequest}
                onHighlightClick={onHighlightClick}
                onRotate={() => rotatePages([page.index])}
                mode={mode}
                selection={pointing.selection?.page === page.index ? pointing.selection : null}
                focusToken={pointing.selection?.page === page.index ? pointing.focusToken : null}
                pointing={pointing.actions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
