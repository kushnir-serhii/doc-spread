import { Link } from 'react-router'
import type { Document, DocumentType } from '@/lib/mock/types'

interface AssignTypeCellProps {
  doc: Document
  types: DocumentType[]
  isPending: boolean
  onAssign: (id: string, typeId: string) => void
}

/** Sits above the stretched row link (relative z-10). */
export const AssignTypeCell = ({ doc, types, isPending, onAssign }: AssignTypeCellProps) => (
  <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-1">
    <select
      aria-label={`Assign type to ${doc.file.name}`}
      value=""
      disabled={isPending}
      onChange={(event) => {
        if (event.target.value) onAssign(doc.id, event.target.value)
      }}
      className="min-h-touch w-44 rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 md:text-sm"
    >
      <option value="">{isPending ? 'Assigning…' : 'Assign type…'}</option>
      {types.map((type) => (
        <option key={type.id} value={type.id}>
          {type.name}
        </option>
      ))}
    </select>
    <Link
      to={`/types/new?from=sample&documentId=${encodeURIComponent(doc.id)}`}
      aria-label={`Create type from ${doc.file.name}`}
      className="inline-flex min-h-touch items-center rounded-sm text-sm font-medium whitespace-nowrap text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      Create type from this
    </Link>
  </div>
)
