import { useState } from 'react'
import { useApproveDocuments } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/mock/types'
import { BulkBar } from './bulk-bar'
import type { DocumentColumn } from './document-column'
import { DocumentList } from './document-list'
import { useSelection } from './use-selection'

interface InboxResultsProps {
  documents: Document[]
  types: DocumentType[]
  columns: DocumentColumn[]
  /** the chosen type when the view is a single type: the only case Export works for */
  exportTypeId: string | undefined
}

const plural = (n: number) => `${n} ${n === 1 ? 'document' : 'documents'}`

/** Selectable list + bulk bar. Mount it with `key` = the view so the selection starts empty per view. */
export const InboxResults = ({ documents, types, columns, exportTypeId }: InboxResultsProps) => {
  const selection = useSelection(documents)
  const approve = useApproveDocuments()
  const [message, setMessage] = useState('')

  const selected = documents.filter((doc) => selection.has(doc.id))
  const approvableIds = selected.filter((doc) => doc.status === 'needs_review').map((doc) => doc.id)
  const skipped = selected.length - approvableIds.length

  const onApprove = () => {
    setMessage('')
    approve.mutate(approvableIds, {
      onSuccess: () => {
        selection.clear()
        setMessage(`${plural(approvableIds.length)} approved${skipped > 0 ? `, ${skipped} skipped` : ''}`)
      },
    })
  }

  return (
    <div className="flex flex-col">
      {/* always mounted: the bar leaves with the selection, the message must survive it */}
      <p role="status" className="mb-3 text-sm text-muted-foreground empty:hidden">
        {message}
      </p>
      {selection.ids.length > 0 && (
        <BulkBar
          count={selection.ids.length}
          approvableCount={approvableIds.length}
          exportHref={
            exportTypeId
              ? `/export?type=${encodeURIComponent(exportTypeId)}&ids=${selection.ids.map(encodeURIComponent).join(',')}`
              : undefined
          }
          isApproving={approve.isPending}
          error={approve.isError ? approve.error.message : undefined}
          onApprove={onApprove}
          onClear={selection.clear}
        />
      )}
      <DocumentList documents={documents} types={types} columns={columns} selection={selection} />
    </div>
  )
}
