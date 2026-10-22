import type { DocumentPage } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { ImagePage } from './image-page'
import { PdfPageCanvas } from './pdf-page-canvas'
import type { ViewerFile } from './viewer-types'

interface ViewerPageProps {
  page: DocumentPage
  file: ViewerFile
  /** CSS px per page unit */
  scale: number
  /** inside the render window: only these pages hold a canvas or image */
  visible: boolean
}

export const ViewerPage = ({ page, file, scale, visible }: ViewerPageProps) => {
  const boxWidth = page.width * scale
  const boxHeight = page.height * scale
  const pageNumber = page.index + 1
  return (
    <div
      data-page-index={page.index}
      role="group"
      aria-label={`Page ${pageNumber} of ${file.pageCount}`}
      className={cn('relative shrink-0 overflow-hidden bg-card shadow-md ring-1 ring-border')}
      // dynamic size: the box comes from the page's width/height and the zoom
      style={{ width: boxWidth, height: boxHeight }}
    >
      {!visible ? (
        <div className="absolute inset-0 bg-muted" />
      ) : file.type === 'pdf' ? (
        <PdfPageCanvas url={file.url} pageIndex={page.index} boxWidth={boxWidth} boxHeight={boxHeight} />
      ) : page.imageUrl ? (
        <ImagePage src={page.imageUrl} pageNumber={pageNumber} />
      ) : null}
    </div>
  )
}
