import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentViewer } from '@/features/documents/viewer/document-viewer'
import type { DocumentViewerHandle, ViewerHighlight } from '@/features/documents/viewer/viewer-highlights'
import type { ViewerMode, ViewerSelection } from '@/features/documents/viewer/viewer-types'
import type { Document } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

interface ReviewViewerPaneProps {
  doc: Document
  highlights: ViewerHighlight[]
  activeHighlightId: string | null
  onHighlightClick: (id: string) => void
  mode: ViewerMode
  onSelect: (selection: ViewerSelection) => void
  onCancel: () => void
  ref?: Ref<DocumentViewerHandle>
}

/** Sticky and tall beside the form on desktop; a collapsible section above it on small screens. */
export const ReviewViewerPane = ({
  doc,
  highlights,
  activeHighlightId,
  onHighlightClick,
  mode,
  onSelect,
  onCancel,
  ref,
}: ReviewViewerPaneProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const pointing = mode !== 'view'
  // pointing needs the document: it opens even when collapsed
  const open = pointing || !collapsed
  useEffect(() => {
    if (pointing) sectionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [pointing])
  const panelId = useId()
  return (
    <section ref={sectionRef} aria-label="Document" className="flex flex-col gap-2 lg:sticky lg:top-20">
      <Button
        variant="outline"
        className="min-h-touch w-full justify-between lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setCollapsed(open)}
      >
        {open ? 'Hide document' : 'Show document'}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </Button>
      <div id={panelId} className={cn('h-96 lg:block lg:h-review-pane', !open && 'hidden')}>
        <DocumentViewer
          ref={ref}
          documentId={doc.id}
          file={doc.file}
          highlights={highlights}
          activeHighlightId={activeHighlightId}
          onHighlightClick={onHighlightClick}
          mode={mode}
          onSelect={onSelect}
          onCancel={onCancel}
        />
      </div>
    </section>
  )
}
