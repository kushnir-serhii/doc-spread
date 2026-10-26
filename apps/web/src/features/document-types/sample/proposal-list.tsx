import type { ReactNode } from 'react'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FieldValue } from '@/lib/mock/types'
import { EmptyProposals } from './empty-proposals'
import { ProposalRow } from './proposal-row'
import type { PointAgain } from './use-point-again'
import type { ProposalItem } from './use-proposal-review'

interface ProposalListProps {
  items: ProposalItem[]
  openCount: number
  values: Record<string, FieldValue> | undefined
  valuesLoading: boolean
  /** The values could not be read; the list still works without them. */
  valuesFailed: boolean
  selectedId: string | null
  pointAgain: PointAgain
  onRetryValues: () => void
  /** The "Point to add" button, shown in the header (or in the empty state). */
  pointAction: ReactNode
  onAcceptAll: () => void
  onActivate: (id: string | null) => void
  onSelect: (id: string) => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRestore: (id: string) => void
  onRename: (id: string, label: string) => void
}

export const ProposalList = ({
  items,
  openCount,
  values,
  valuesLoading,
  valuesFailed,
  selectedId,
  onRetryValues,
  pointAction,
  onAcceptAll,
  ...rowActions
}: ProposalListProps) => {
  if (items.length === 0) return <EmptyProposals pointAction={pointAction} />
  return (
    <section aria-label="Proposed fields" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Proposed fields ({items.length})</h2>
        <div className="flex flex-wrap gap-2">
          {pointAction}
          <Button size="sm" onClick={onAcceptAll} disabled={openCount === 0} className="min-h-touch md:min-h-9">
            <CheckCheck aria-hidden /> Accept all{openCount > 0 && ` (${openCount})`}
          </Button>
        </div>
      </div>
      {valuesFailed && (
        <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          Couldn’t read the values from the sample.
          <Button size="sm" variant="outline" onClick={onRetryValues} className="min-h-touch md:min-h-9">
            Retry
          </Button>
        </p>
      )}
      <ul className="divide-y rounded-lg border bg-card">
        {items.map((item, index) => (
          <ProposalRow
            key={item.field.id}
            item={item}
            position={index + 1}
            value={values?.[item.field.id]}
            valueLoading={valuesLoading}
            selected={selectedId === item.field.id}
            {...rowActions}
          />
        ))}
      </ul>
    </section>
  )
}
