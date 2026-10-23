import { useReassignDocumentType } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/mock/types'
import { AssignTypeCell } from './assign-type-cell'
import { unclassifiedColumns } from './document-columns'
import { DocumentTable } from './document-table'
import { UnclassifiedEmpty } from './unclassified-empty'

interface UnclassifiedViewProps {
  documents: Document[]
  types: DocumentType[]
}

/** Unclassified bucket. One mutation; a row is pending when its id is the in-flight variable. */
export const UnclassifiedView = ({ documents, types }: UnclassifiedViewProps) => {
  const reassign = useReassignDocumentType()
  const pendingId = reassign.isPending ? reassign.variables.id : undefined
  const assigned = reassign.isSuccess
    ? { file: reassign.data.file.name, type: types.find((type) => type.id === reassign.data.typeId)?.name }
    : undefined

  const columns = unclassifiedColumns({
    id: 'actions',
    header: 'Classify',
    cell: (doc) => (
      <AssignTypeCell
        doc={doc}
        types={types}
        isPending={pendingId === doc.id}
        onAssign={(id, typeId) => reassign.mutate({ id, typeId })}
      />
    ),
  })

  return (
    <>
      {/* one region for the whole page, kept mounted so the message survives the row leaving */}
      <p role="status" className="sr-only">
        {assigned ? `${assigned.file} assigned to ${assigned.type ?? 'the chosen type'}, processing` : ''}
      </p>
      {reassign.isError && (
        <p role="alert" className="mb-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Couldn't assign the type: {reassign.error.message}
        </p>
      )}
      {documents.length === 0 ? <UnclassifiedEmpty /> : <DocumentTable documents={documents} columns={columns} />}
    </>
  )
}
