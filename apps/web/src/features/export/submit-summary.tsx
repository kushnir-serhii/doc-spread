import type { ReactNode } from 'react'
import type { ExportFormat } from '@/lib/mock/types'
import { formatLabel } from './export-summary'
import type { MoneyTotal } from './export-summary'

interface SubmitSummaryProps {
  count: number
  totals: MoneyTotal[]
  format: ExportFormat
  /** undefined while the destination cannot be named yet */
  destination: string | undefined
}

const Row = ({ term, children }: { term: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
    <dt className="text-muted-foreground sm:w-40 sm:shrink-0">{term}</dt>
    <dd className="min-w-0 wrap-break-word font-medium">{children}</dd>
  </div>
)

export const SubmitSummary = ({ count, totals, format, destination }: SubmitSummaryProps) => (
  <dl className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
    <Row term="Documents">{count === 1 ? '1 document' : `${count} documents`}</Row>
    {totals.map((total) => (
      <Row key={total.columnKey} term={total.label}>
        {total.amounts.length > 0 ? total.amounts.join(' · ') : '—'}
      </Row>
    ))}
    <Row term="Format">{formatLabel(format)}</Row>
    <Row term="Destination">{destination ?? 'Choose a recipient'}</Row>
  </dl>
)
