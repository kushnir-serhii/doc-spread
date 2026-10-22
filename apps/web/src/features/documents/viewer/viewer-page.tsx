import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentPage } from '@/lib/mock/types'
import { ImagePage } from './image-page'
import { PageOverlay } from './page-overlay'
import { PdfPageCanvas } from './pdf-page-canvas'
import { rotatedSize, type ViewRotation } from './rotation'
import { TokenOutlines } from './token-outlines'
import { HighlightBox } from './highlight-box'
import type { ViewerHighlight } from './viewer-highlights'
import type { ViewerFile } from './viewer-types'

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
}: ViewerPageProps) => {
  // the unrotated page box; the page box swaps width and height at 90 and 270 degrees
  const pageWidth = page.width * scale
  const pageHeight = page.height * scale
  const box = rotatedSize(pageWidth, pageHeight, rotation)
  const pageNumber = page.index + 1
  return (
    <div
      data-page-index={page.index}
      role="group"
      aria-label={`Page ${pageNumber} of ${file.pageCount}`}
      className="group relative shrink-0 overflow-hidden bg-card shadow-md ring-1 ring-border"
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
      {visible && (showTokens || highlights.length > 0) && (
        <PageOverlay width={pageWidth} height={pageHeight} rotation={rotation}>
          {showTokens && <TokenOutlines tokens={page.tokens} />}
          {highlights.map((h) => (
            <HighlightBox
              key={h.id}
              highlight={h}
              active={h.id === activeHighlightId}
              focusRequested={h.id === focusHighlightId}
              onFocused={onHighlightFocused}
              onClick={onHighlightClick}
            />
          ))}
        </PageOverlay>
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
