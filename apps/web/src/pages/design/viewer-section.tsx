import { useRef, useState } from 'react'
import { DocumentViewer } from '@/features/documents/viewer/document-viewer'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import { useDocument } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useDemoHighlights } from './use-demo-highlights'

const DEMO_DOCUMENTS = [
  { id: 'doc-028', label: '30-page PDF' },
  { id: 'doc-001', label: 'Invoice (rotated page 2)' },
  { id: 'doc-002', label: 'Receipt (JPG)' },
]

export const ViewerSection = () => {
  const [documentId, setDocumentId] = useState(DEMO_DOCUMENTS[0].id)
  const [showTokens, setShowTokens] = useState(false)
  const { data: doc, isError, refetch } = useDocument(documentId)
  const highlights = useDemoHighlights(doc)
  const [activeState, setActiveState] = useState<{ documentId: string; id: string } | null>(null)
  // the active highlight belongs to one document, so switching documents clears it
  const activeId = activeState?.documentId === documentId ? activeState.id : null
  const viewerRef = useRef<DocumentViewerHandle>(null)
  const pick = (id: string) => setActiveState({ documentId, id })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Demo document">
        {DEMO_DOCUMENTS.map((d) => (
          <Button
            key={d.id}
            variant={d.id === documentId ? 'secondary' : 'outline'}
            className="min-h-touch"
            aria-pressed={d.id === documentId}
            onClick={() => setDocumentId(d.id)}
          >
            {d.label}
          </Button>
        ))}
        <Button
          variant={showTokens ? 'secondary' : 'outline'}
          className="min-h-touch"
          aria-pressed={showTokens}
          onClick={() => setShowTokens((v) => !v)}
        >
          Show OCR tokens
        </Button>
      </div>
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Highlights">
          {highlights.map((h) => (
            <Button
              key={h.id}
              variant={h.id === activeId ? 'secondary' : 'outline'}
              size="sm"
              className="min-h-touch max-w-full"
              aria-pressed={h.id === activeId}
              onClick={() => {
                pick(h.id)
                viewerRef.current?.scrollToHighlight(h.id)
              }}
            >
              <span className="truncate">{h.label}</span>
            </Button>
          ))}
        </div>
      )}
      <div className="h-[32rem]">
        {doc ? (
          <DocumentViewer
            key={doc.id}
            ref={viewerRef}
            documentId={doc.id}
            file={doc.file}
            showTokens={showTokens}
            highlights={highlights}
            activeHighlightId={activeId}
            onHighlightClick={pick}
          />
        ) : isError ? (
          <div role="alert" className="text-sm">
            Could not load the document.{' '}
            <Button variant="link" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="size-full animate-pulse rounded-lg bg-muted" role="status" aria-label="Loading document" />
        )}
      </div>
    </div>
  )
}
