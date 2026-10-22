import { useRef, useState } from 'react'
import { DocumentViewer } from '@/features/documents/viewer/document-viewer'
import type { DocumentViewerHandle } from '@/features/documents/viewer/viewer-highlights'
import type { ViewerMode, ViewerSelection } from '@/features/documents/viewer/viewer-types'
import { useDocument } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useDemoHighlights } from './use-demo-highlights'

const DEMO_DOCUMENTS = [
  { id: 'doc-028', label: '30-page PDF' },
  { id: 'doc-001', label: 'Invoice (rotated page 2)' },
  { id: 'doc-002', label: 'Receipt (JPG)' },
]

const MODES: { mode: ViewerMode; label: string }[] = [
  { mode: 'view', label: 'View' },
  { mode: 'select-words', label: 'Select words' },
  { mode: 'select-region', label: 'Select region' },
]

const round = (n: number) => n.toFixed(3)

export const ViewerSection = () => {
  const [documentId, setDocumentId] = useState(DEMO_DOCUMENTS[0].id)
  const [showTokens, setShowTokens] = useState(false)
  const { data: doc, isError, refetch } = useDocument(documentId)
  const highlights = useDemoHighlights(doc)
  const [activeState, setActiveState] = useState<{ documentId: string; id: string } | null>(null)
  // the active highlight belongs to one document, so switching documents clears it
  const activeId = activeState?.documentId === documentId ? activeState.id : null
  const viewerRef = useRef<DocumentViewerHandle>(null)
  const [mode, setMode] = useState<ViewerMode>('view')
  // null = nothing yet; 'cancelled' after Esc / Cancel
  const [result, setResult] = useState<ViewerSelection | 'cancelled' | null>(null)
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
      <div className="flex flex-wrap gap-2" role="group" aria-label="Viewer mode">
        {MODES.map((m) => (
          <Button
            key={m.mode}
            variant={m.mode === mode ? 'secondary' : 'outline'}
            className="min-h-touch"
            aria-pressed={m.mode === mode}
            onClick={() => {
              setMode(m.mode)
              setResult(null)
            }}
          >
            {m.label}
          </Button>
        ))}
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
            mode={mode}
            onSelect={setResult}
            onCancel={() => setResult('cancelled')}
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
      <output className="rounded-md border p-3 text-sm" aria-live="polite">
        {result === null ? (
          <span className="text-muted-foreground">Confirm a selection to see what onSelect delivers.</span>
        ) : result === 'cancelled' ? (
          'Cancelled'
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Page</dt>
            <dd>{result.page + 1}</dd>
            <dt className="text-muted-foreground">Tokens</dt>
            <dd>{result.tokens.length}</dd>
            <dt className="text-muted-foreground">Text</dt>
            <dd className="break-words">{result.text || '(empty)'}</dd>
            <dt className="text-muted-foreground">BBox</dt>
            <dd className="amount">
              x {round(result.bbox.x)}, y {round(result.bbox.y)}, w {round(result.bbox.w)}, h {round(result.bbox.h)}
            </dd>
          </dl>
        )}
      </output>
    </div>
  )
}
