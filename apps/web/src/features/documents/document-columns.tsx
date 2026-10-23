import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { StatusBadge } from '@/components/domain/status-badge'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import { formatDate } from '@/lib/mock/format'
import type { DocumentStatus, DocumentType, FieldDef } from '@/lib/mock/types'
import type { DocumentColumn } from './document-column'
import { documentTitle } from './document-title'
import { DocumentTitleLink } from './document-title-link'
import { TruncatedText } from './truncated-text'

const NO_CONFIDENCE: DocumentStatus[] = ['uploaded', 'processing', 'unclassified', 'rejected', 'error']
/** Title + up to 6 type columns + status must fit ~1000px, so cells get narrower as columns grow. */
const WIDE_COLUMN_LIMIT = 4

const titleColumn = (typesById: Map<string, DocumentType>): DocumentColumn => ({
  id: 'title',
  header: 'Title',
  cell: (doc) => {
    const type = doc.typeId ? typesById.get(doc.typeId) : undefined
    return <DocumentTitleLink id={doc.id} title={documentTitle(doc, type)} />
  },
})

const uploadedColumn: DocumentColumn = {
  id: 'uploaded',
  header: 'Uploaded',
  cell: (doc) => <span className="text-muted-foreground">{formatDate(doc.uploadedAt)}</span>,
}

const statusColumn: DocumentColumn = {
  id: 'status',
  header: 'Status',
  cell: (doc) => <StatusBadge status={doc.status} />,
}

const confidenceColumn: DocumentColumn = {
  id: 'confidence',
  header: 'Confidence',
  cell: (doc) =>
    NO_CONFIDENCE.includes(doc.status) ? (
      <span className="text-muted-foreground" aria-label="No confidence yet">
        —
      </span>
    ) : (
      <ConfidenceBadge score={doc.overallConfidence} />
    ),
}

const fieldColumn = (field: FieldDef, widthClass: string): DocumentColumn => ({
  id: field.id,
  header: field.label,
  align: field.type === 'money' || field.type === 'number' ? 'right' : undefined,
  cell: (doc) => <TruncatedText text={formatFieldValue(doc.values[field.id])} className={widthClass} />,
})

export const allColumns = (types: DocumentType[]): DocumentColumn[] => {
  const typesById = new Map(types.map((type) => [type.id, type]))
  return [
    titleColumn(typesById),
    {
      id: 'type',
      header: 'Type',
      cell: (doc) => {
        const type = doc.typeId ? typesById.get(doc.typeId) : undefined
        return (
          <span className="text-muted-foreground">
            <TruncatedText text={type?.name ?? (doc.typeId ? '—' : 'Unclassified')} className="max-w-48" />
          </span>
        )
      },
    },
    uploadedColumn,
    statusColumn,
    confidenceColumn,
  ]
}

export const unclassifiedColumns = (actionsColumn: DocumentColumn): DocumentColumn[] => [
  titleColumn(new Map()),
  uploadedColumn,
  statusColumn,
  actionsColumn,
]

export const typeColumns = (type: DocumentType): DocumentColumn[] => {
  const fields = type.listColumnIds
    .map((id) => type.fields.find((field) => field.id === id))
    .filter((field): field is FieldDef => field !== undefined)
  const widthClass = fields.length > WIDE_COLUMN_LIMIT ? 'max-w-24' : 'max-w-40'
  return [titleColumn(new Map([[type.id, type]])), ...fields.map((field) => fieldColumn(field, widthClass)), statusColumn]
}
