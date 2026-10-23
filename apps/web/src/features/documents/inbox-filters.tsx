import { useId } from 'react'
import { LoaderCircle } from 'lucide-react'
import { STATUS_LABELS } from '@/components/domain/status-labels'
import { Label } from '@/components/ui/label'
import { DOCUMENT_STATUSES } from '@/lib/mock/types'
import type { DocumentStatus } from '@/lib/mock/types'
import { InboxSearch } from './inbox-search'

interface InboxFiltersProps {
  search: string
  status: DocumentStatus | undefined
  /** false in the Unclassified view, where status is fixed */
  showStatus: boolean
  /** undefined until the first list loads */
  resultCount: number | undefined
  /** previous results are shown while new ones load */
  isUpdating: boolean
  onSearchCommit: (value: string) => void
  onStatusChange: (status: DocumentStatus | undefined) => void
}

const countLabel = (count: number) => `${count} ${count === 1 ? 'document' : 'documents'}`

export const InboxFilters = ({
  search,
  status,
  showStatus,
  resultCount,
  isUpdating,
  onSearchCommit,
  onStatusChange,
}: InboxFiltersProps) => {
  const selectId = useId()
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <InboxSearch value={search} onCommit={onSearchCommit} />
      {showStatus && (
        <div className="flex flex-col gap-1.5 sm:w-48">
          <Label htmlFor={selectId}>Status</Label>
          <select
            id={selectId}
            value={status ?? ''}
            onChange={(event) =>
              onStatusChange(DOCUMENT_STATUSES.find((candidate) => candidate === event.target.value))
            }
            className="min-h-touch w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:text-sm"
          >
            <option value="">All statuses</option>
            {DOCUMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      )}
      <p role="status" className="flex min-h-touch items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
        {isUpdating && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {resultCount !== undefined && countLabel(resultCount)}
      </p>
    </div>
  )
}
