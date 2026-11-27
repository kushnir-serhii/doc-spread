import { useState } from 'react'
import { useReassignDocumentType } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/mock/types'
import { AssignTypeCell } from './assign-type-cell'
import { unclassifiedColumns } from './document-columns'
import { DocumentList } from './document-list'
import { UnclassifiedBulkBar } from './unclassified-bulk-bar'
import { UnclassifiedEmpty } from './unclassified-empty'
import { useBulkAssign } from './use-bulk-assign'
import { useSelection } from './use-selection'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

interface UnclassifiedViewProps {
  documents: Document[]
  types: DocumentType[]
}

/** Unclassified bucket. Per row: one mutation (pending = the in-flight id). Bulk: one request per selected document. */
export const UnclassifiedView = ({ documents, types }: UnclassifiedViewProps) => {
  const locale = useFormatLocale()
  const reassign = useReassignDocumentType()
  const bulk = useBulkAssign()
  const selection = useSelection(documents)
  const [bulkMessage, setBulkMessage] = useState('')
  const pendingId = reassign.isPending ? reassign.variables.id : undefined
  const assigned = reassign.isSuccess
    ? { file: reassign.data.file.name, type: types.find((type) => type.id === reassign.data.typeId)?.name }
    : undefined

  const failedDocs = documents.filter((doc) => bulk.errors[doc.id] !== undefined)

  const onBulkAssign = async (typeId: string) => {
    const ids = [...selection.ids]
    const typeName = types.find((type) => type.id === typeId)?.name ?? 'the chosen type'
    setBulkMessage('')
    const result = await bulk.run(ids, typeId)
    selection.deselect(result.succeeded)
    const failedCount = Object.keys(result.failed).length
    setBulkMessage(
      [
        result.succeeded.length > 0 ? `${result.succeeded.length} assigned to ${typeName}, processing.` : '',
        failedCount > 0 ? `${failedCount} couldn't be assigned.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    )
  }

  const columns = unclassifiedColumns(
    {
      id: 'actions',
      header: 'Classify',
      cell: (doc) => (
        <AssignTypeCell
          doc={doc}
          types={types}
          isPending={pendingId === doc.id || bulk.isRunning}
          error={bulk.errors[doc.id]}
          onAssign={(id, typeId) => reassign.mutate({ id, typeId })}
        />
      ),
    },
    locale,
  )

  return (
    <div className="flex flex-col">
      {/* one region for the whole page, kept mounted so the message survives the row leaving */}
      <p role="status" className="sr-only">
        {bulkMessage ||
          (assigned ? `${assigned.file} assigned to ${assigned.type ?? 'the chosen type'}, processing` : '')}
      </p>
      {bulkMessage && <p aria-hidden="true" className="mb-3 text-sm text-muted-foreground">{bulkMessage}</p>}
      {reassign.isError && (
        <p role="alert" className="mb-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Couldn't assign the type: {reassign.error.message}
        </p>
      )}
      {failedDocs.length > 0 && (
        <div role="alert" className="mb-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          <p>
            {failedDocs.length} {failedDocs.length === 1 ? 'document' : 'documents'} couldn't be assigned and
            stay selected:
          </p>
          <ul className="mt-1 list-disc pl-5">
            {failedDocs.map((doc) => (
              <li key={doc.id} className="wrap-break-word">
                {doc.file.name}: {bulk.errors[doc.id]}
              </li>
            ))}
          </ul>
        </div>
      )}
      {selection.ids.length > 0 && (
        <UnclassifiedBulkBar
          count={selection.ids.length}
          types={types}
          isAssigning={bulk.isRunning}
          onAssign={onBulkAssign}
          onClear={selection.clear}
        />
      )}
      {documents.length === 0 ? (
        <UnclassifiedEmpty />
      ) : (
        <DocumentList documents={documents} types={types} columns={columns} selection={selection} />
      )}
    </div>
  )
}
