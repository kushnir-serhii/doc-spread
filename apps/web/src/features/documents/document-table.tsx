import { Link } from 'react-router'
import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { StatusBadge } from '@/components/domain/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import { formatDate } from '@/lib/mock/format'
import type { Document, DocumentStatus, DocumentType } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

interface DocumentTableProps {
  documents: Document[]
  types: DocumentType[]
}

const NO_CONFIDENCE: DocumentStatus[] = ['uploaded', 'processing', 'unclassified', 'rejected', 'error']

const documentTitle = (doc: Document, type: DocumentType | undefined): string => {
  if (type?.titleFieldId) {
    const title = formatFieldValue(doc.values[type.titleFieldId])
    if (title !== '—') return title
  }
  return doc.file.name
}

const TruncatedText = ({ text, className = 'max-w-64' }: { text: string; className?: string }) => (
  <span title={text} className={cn('block truncate', className)}>
    {text}
  </span>
)

export const DocumentTable = ({ documents, types }: DocumentTableProps) => {
  const typesById = new Map(types.map((type) => [type.id, type]))

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const type = doc.typeId ? typesById.get(doc.typeId) : undefined
            const title = documentTitle(doc, type)
            const typeName = type?.name ?? (doc.typeId ? '—' : 'Unclassified')
            return (
              <TableRow key={doc.id} className="relative min-h-touch cursor-pointer">
                <TableCell className="font-medium">
                  <Link
                    to={`/documents/${doc.id}`}
                    title={title}
                    className="block max-w-72 truncate rounded-sm outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    {title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <TruncatedText text={typeName} className="max-w-48" />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(doc.uploadedAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell>
                  {NO_CONFIDENCE.includes(doc.status) ? (
                    <span className="text-muted-foreground" aria-label="No confidence yet">
                      —
                    </span>
                  ) : (
                    <ConfidenceBadge score={doc.overallConfidence} />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
