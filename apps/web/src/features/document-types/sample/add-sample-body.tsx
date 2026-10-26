import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDemoDocuments, useDocuments } from '@/lib/api'
import type { Document } from '@/lib/mock/types'
import { SampleDocumentList } from './sample-document-list'
import { SampleUpload } from './sample-upload'

export type AddSampleView = 'upload' | 'inbox' | 'examples'

const VIEWS: { id: AddSampleView; label: string }[] = [
  { id: 'upload', label: 'Upload a file' },
  { id: 'inbox', label: 'No type yet' },
  { id: 'examples', label: 'Example documents' },
]

interface AddSampleBodyProps {
  initialView: AddSampleView
  takenIds: string[]
  onAdd: (documentId: string) => void
}

/** The three ways to get a sample: a new file, a document without a type (Inbox), a demo document. */
export const AddSampleBody = ({ initialView, takenIds, onAdd }: AddSampleBodyProps) => {
  const [view, setView] = useState(initialView)
  const inbox = useDocuments({ status: 'unclassified' })
  const demos = useDemoDocuments()
  const demoDocs = demos.every((query) => query.data) ? demos.flatMap((query) => (query.data ? [query.data] : [])) : undefined
  const demoFailed = demos.some((query) => query.isError)
  const list: Document[] | undefined = view === 'inbox' ? inbox.data : demoDocs

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="group" aria-label="Where the sample comes from" className="flex flex-wrap gap-2">
        {VIEWS.map(({ id, label }) => (
          <Button
            key={id}
            size="sm"
            variant={view === id ? 'default' : 'outline'}
            aria-pressed={view === id}
            className="min-h-touch md:min-h-9"
            onClick={() => setView(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {view === 'upload' ? (
        <SampleUpload onUploaded={onAdd} />
      ) : (
        <SampleDocumentList
          documents={list}
          failed={view === 'inbox' ? inbox.isError : demoFailed}
          takenIds={takenIds}
          emptyText={view === 'inbox' ? 'No documents without a type in the Inbox.' : 'No example documents available.'}
          onRetry={() => (view === 'inbox' ? void inbox.refetch() : demos.forEach((query) => void query.refetch()))}
          onPick={onAdd}
        />
      )}
    </div>
  )
}
