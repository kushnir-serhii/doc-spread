import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DocumentPage, Token } from '@/lib/mock/types'
import { ImagePage } from './image-page'
import { PageOverlay } from './page-overlay'
import { PdfPageCanvas } from './pdf-page-canvas'
import { rotatedSize, type ViewRotation } from './rotation'
import { SelectionLayer } from './selection-layer'
import { TokenOutlines } from './token-outlines'
import { usePagePointer } from './use-page-pointer'
import type { PointingActions } from './use-pointing'
import { HighlightBox } from './highlight-box'
import type { ViewerHighlight } from './viewer-highlights'
import type { ViewerFile, ViewerMode, ViewerSelection } from './viewer-types'

interface ViewerPageProps {
  page: DocumentPage
  file: ViewerFile
  /** CSS px per page unit */
  scale: number
  /** inside the render window: only these pages hold a canvas or image */
  visible: boolean
  rotation: ViewRotation
  showTokens: boolean
  /** only this page's highlights */
  highlights: ViewerHighlight[]
  activeHighlightId?: string | null
  focusHighlightId: string | null
  onHighlightFocused: () => void
  onHighlightClick?: (id: string) => void
  onRotate: () => void
  mode: ViewerMode
  /** the pending/live selection, only when it lives on this page */
  selection: ViewerSelection | null
  focusToken: Token | null
  pointing: PointingActions
}

export const ViewerPage = ({
  page,
  file,
  scale,
  visible,
  rotation,
  showTokens,
  highlights,
  activeHighlightId,
  focusHighlightId,
  onHighlightFocused,
  onHighlightClick,
  onRotate,
  mode,
  selection,
  focusToken,
  pointing,
}: ViewerPageProps) => {
  // the unrotated page box; the page box swaps width and height at 90 and 270 degrees
  const pageWidth = page.width * scale
  const pageHeight = page.height * scale
  const box = rotatedSize(pageWidth, pageHeight, rotation)
  const pageNumber = page.index + 1
  const pointer = usePagePointer({ mode, pageIndex: page.index, rotation, actions: pointing })
  const selecting = mode !== 'view'
  return (
    <div
      data-page-index={page.index}
      role="group"
      aria-label={mode === 'select-words' ? `Page ${pageNumber}, select words` : `Page ${pageNumber} of ${file.pageCount}`}
      tabIndex={mode === 'select-words' ? 0 : undefined}
      className={cn(
        'group relative shrink-0 overflow-hidden bg-card shadow-md ring-1 ring-border outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2',
        selecting && 'touch-none select-none',
        mode === 'select-words' && 'cursor-text',
        mode === 'select-region' && 'cursor-crosshair',
      )}
      {...pointer}
      // dynamic size: the box comes from the page's width/height, the rotation and the zoom
      style={{ width: box.width, height: box.height }}
    >
      {!visible ? (
        <div className="absolute inset-0 bg-muted" />
      ) : file.type === 'pdf' ? (
        <PdfPageCanvas url={file.url} pageIndex={page.index} boxWidth={box.width} boxHeight={box.height} rotation={rotation} />
      ) : page.imageUrl ? (
        <ImagePage src={page.imageUrl} pageNumber={pageNumber} width={pageWidth} height={pageHeight} rotation={rotation} />
      ) : null}
      {visible && (showTokens || highlights.length > 0 || selection) && (
        <PageOverlay width={pageWidth} height={pageHeight} rotation={rotation}>
          {showTokens && <TokenOutlines tokens={page.tokens} />}
          {highlights.map((h) => (
            <HighlightBox
              key={h.id}
              highlight={h}
              state={!activeHighlightId ? 'rest' : h.id === activeHighlightId ? 'active' : 'dimmed'}
              focusRequested={h.id === focusHighlightId}
              onFocused={onHighlightFocused}
              onClick={onHighlightClick}
              passive={selecting}
            />
          ))}
          {selection && <SelectionLayer selection={selection} focusTokenId={focusToken?.id ?? null} />}
        </PageOverlay>
      )}
      {focusToken && (
        <span className="sr-only" aria-live="polite">
          {focusToken.text}
        </span>
      )}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-2 right-2 size-touch opacity-0 shadow-md group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
        aria-label={`Rotate page ${pageNumber}`}
        onClick={onRotate}
      >
        <RotateCw aria-hidden="true" />
      </Button>
    </div>
  )
}
