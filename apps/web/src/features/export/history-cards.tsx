import type { ExportJob } from '@/lib/mock/types'
import { ExportStatusBadge } from './export-status-badge'
import { formatLabel } from './export-summary'
import { jobDate, jobDestination } from './history-job'

interface HistoryCardsProps {
  jobs: ExportJob[]
  typeName: (job: ExportJob) => string
}

export const HistoryCards = ({ jobs, typeName }: HistoryCardsProps) => (
  <ul className="space-y-2">
    {jobs.map((job) => (
      <li key={job.id} className="space-y-2 rounded-lg border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{typeName(job)}</p>
            <p className="text-sm text-muted-foreground">{jobDate(job)}</p>
          </div>
          <ExportStatusBadge status={job.status} />
        </div>
        <p className="text-sm tabular-nums">
          {formatLabel(job.format)} · {job.documentIds.length} {job.documentIds.length === 1 ? 'document' : 'documents'}
        </p>
        <p className="truncate text-sm text-muted-foreground" title={jobDestination(job)}>
          {jobDestination(job)}
        </p>
      </li>
    ))}
  </ul>
)
