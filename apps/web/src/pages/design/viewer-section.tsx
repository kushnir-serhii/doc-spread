import { useState } from 'react'
import { DocumentViewer } from '@/features/documents/viewer/document-viewer'
import { useDocument } from '@/lib/api'
import { Button } from '@/components/ui/button'

const DEMO_DOCUMENTS = [
  { id: 'doc-028', label: '30-page PDF' },
  { id: 'doc-001', label: 'Invoice (rotated page 2)' },
  { id: 'doc-002', label: 'Receipt (JPG)' },
]

export const ViewerSection = () => {
  const [documentId, setDocumentId] = useState(DEMO_DOCUMENTS[0].id)
  const { data: doc, isError, refetch } = useDocument(documentId)

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
      </div>
      <div className="h-[32rem]">
        {doc ? (
          <DocumentViewer key={doc.id} documentId={doc.id} file={doc.file} />
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
