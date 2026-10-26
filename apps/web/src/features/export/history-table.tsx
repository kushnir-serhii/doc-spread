import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ExportJob } from '@/lib/mock/types'
import { ExportStatusBadge } from './export-status-badge'
import { formatLabel } from './export-summary'
import { jobDate, jobDestination } from './history-job'

interface HistoryTableProps {
  jobs: ExportJob[]
  typeName: (job: ExportJob) => string
}

export const HistoryTable = ({ jobs, typeName }: HistoryTableProps) => (
  <div className="rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-3">Date</TableHead>
          <TableHead className="px-3">Type</TableHead>
          <TableHead className="px-3">Format</TableHead>
          <TableHead className="px-3 text-right">Documents</TableHead>
          <TableHead className="px-3">Destination</TableHead>
          <TableHead className="px-3">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="px-3">{jobDate(job)}</TableCell>
            <TableCell className="max-w-48 truncate px-3" title={typeName(job)}>
              {typeName(job)}
            </TableCell>
            <TableCell className="px-3">{formatLabel(job.format)}</TableCell>
            <TableCell className="px-3 text-right tabular-nums">{job.documentIds.length}</TableCell>
            <TableCell className="max-w-64 truncate px-3" title={jobDestination(job)}>
              {jobDestination(job)}
            </TableCell>
            <TableCell className="px-3">
              <ExportStatusBadge status={job.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
