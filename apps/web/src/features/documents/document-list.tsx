import type { Document, DocumentType } from '@/lib/mock/types'
import type { DocumentColumn } from './document-column'
import { DocumentCard } from './document-card'
import { documentTitle } from './document-title'
import { DocumentTable } from './document-table'
import { SelectCheckbox } from './select-checkbox'
import type { Selection } from './use-selection'

interface DocumentListProps {
  documents: Document[]
  types: DocumentType[]
  columns: DocumentColumn[]
  /** omitted where selection makes no sense (unclassified: actions are per row) */
  selection?: Selection
}

/** Table from md up, cards below it; switched in CSS so there is no JS media query. */
export const DocumentList = ({ documents, types, columns, selection }: DocumentListProps) => {
  const typesById = new Map(types.map((type) => [type.id, type]))
  const typeOf = (doc: Document) => (doc.typeId ? typesById.get(doc.typeId) : undefined)
  const titleFor = (doc: Document) => documentTitle(doc, typeOf(doc))

  return (
    <>
      <div className="hidden md:block">
        <DocumentTable documents={documents} columns={columns} titleFor={titleFor} selection={selection} />
      </div>
      <div className="md:hidden">
        {selection && (
          <div className="mb-1 flex items-center gap-1 text-sm">
            <SelectCheckbox
              label={`Select all ${documents.length} documents`}
              checked={selection.state === 'all'}
              indeterminate={selection.state === 'some'}
              onChange={selection.toggleAll}
              className="-ml-2"
            />
            <span aria-hidden="true" className="text-muted-foreground">
              Select all {documents.length}
            </span>
          </div>
        )}
        <ul className="space-y-2">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              title={titleFor(doc)}
              typeName={typeOf(doc)?.name ?? (doc.typeId ? '—' : 'Unclassified')}
              columns={columns}
              selection={selection}
            />
          ))}
        </ul>
      </div>
    </>
  )
}
