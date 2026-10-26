import { SelectCheckbox } from '@/features/documents/select-checkbox'
import { documentTitle } from '@/features/documents/document-title'
import { TruncatedText } from '@/features/documents/truncated-text'
import type { Selection } from '@/features/documents/use-selection'
import { formatDate } from '@/lib/mock/format'
import type { Document, DocumentType } from '@/lib/mock/types'

interface ExportDocumentListProps {
  documents: Document[]
  type: DocumentType
  selection: Selection
}

/** Scrolls inside its own box so 50+ documents never push the options out of reach. */
export const ExportDocumentList = ({ documents, type, selection }: ExportDocumentListProps) => (
  <div className="rounded-lg border">
    <div className="flex flex-wrap items-center gap-x-4 border-b px-1 pr-3">
      <SelectCheckbox
        label="Select all documents"
        checked={selection.state === 'all'}
        indeterminate={selection.state === 'some'}
        onChange={selection.toggleAll}
      />
      <p role="status" className="text-sm font-medium tabular-nums">
        {selection.ids.length} of {documents.length} selected
      </p>
      <button
        type="button"
        onClick={selection.clear}
        disabled={selection.ids.length === 0}
        className="ml-auto min-h-touch rounded-sm px-2 text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 md:min-h-9"
      >
        Clear
      </button>
    </div>
    <ul className="max-h-96 divide-y overflow-y-auto">
      {documents.map((doc) => {
        const title = documentTitle(doc, type)
        return (
          <li key={doc.id} className="flex items-center gap-1 pr-3">
            <SelectCheckbox label={`Select ${title}`} checked={selection.has(doc.id)} onChange={() => selection.toggle(doc.id)} />
            <div className="grid min-w-0 flex-1 gap-x-4 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] sm:items-center">
              <TruncatedText text={title} className="max-w-full text-sm font-medium" />
              <TruncatedText text={doc.file.name} className="max-w-full text-sm text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{formatDate(doc.uploadedAt)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  </div>
)
