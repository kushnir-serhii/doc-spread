import { StatusBadge } from '@/components/domain/status-badge'
import type { Document } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import type { DocumentColumn } from './document-column'
import { SelectCheckbox } from './select-checkbox'
import type { Selection } from './use-selection'

interface DocumentCardProps {
  doc: Document
  title: string
  typeName: string
  columns: DocumentColumn[]
  selection?: Selection
}

const TITLE_ID = 'title'
const ACTIONS_ID = 'actions'
/** shown in the card header already */
const HEADER_IDS = [TITLE_ID, 'type', 'status', ACTIONS_ID]
const EXTRA_COUNT = 2

/** Mobile row: title, type, status, the first two other columns; the actions column (if any) goes last. */
export const DocumentCard = ({ doc, title, typeName, columns, selection }: DocumentCardProps) => {
  const titleColumn = columns.find((column) => column.id === TITLE_ID)
  const actions = columns.find((column) => column.id === ACTIONS_ID)
  const extras = columns.filter((column) => !HEADER_IDS.includes(column.id)).slice(0, EXTRA_COUNT)
  const selected = selection?.has(doc.id) ?? false

  return (
    <li className={cn('relative flex items-start gap-1 rounded-lg border p-3 transition-colors', selected && 'bg-muted')}>
      {selection && (
        <SelectCheckbox
          label={`Select ${title}`}
          checked={selected}
          onChange={() => selection.toggle(doc.id)}
          className="-mt-1 -ml-2 shrink-0"
        />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {titleColumn?.cell(doc)}
            <p className="truncate text-sm text-muted-foreground">{typeName}</p>
          </div>
          <StatusBadge status={doc.status} />
        </div>
        {extras.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {extras.map((column) => (
              <div key={column.id} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{column.header}</dt>
                <dd className={cn(column.align === 'right' && 'tabular-nums')}>{column.cell(doc)}</dd>
              </div>
            ))}
          </dl>
        )}
        {actions?.cell(doc)}
      </div>
    </li>
  )
}
