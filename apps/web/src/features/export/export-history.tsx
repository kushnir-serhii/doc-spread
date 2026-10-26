import { useDocumentTypes, useExportJobs } from '@/lib/api'
import type { ExportJob } from '@/lib/mock/types'
import { ExportError } from './export-error'
import { HistoryCards } from './history-cards'
import { HistoryEmpty } from './history-empty'
import { DELETED_TYPE } from './history-job'
import { HistorySkeleton } from './history-skeleton'
import { HistoryTable } from './history-table'

interface ExportHistoryProps {
  onNewExport: () => void
}

/** Table from md up, cards below it (switched in CSS, like the Inbox). */
export const ExportHistory = ({ onNewExport }: ExportHistoryProps) => {
  const jobsQuery = useExportJobs()
  const typesQuery = useDocumentTypes()

  if (jobsQuery.isError || typesQuery.isError) {
    return (
      <ExportError
        onRetry={() => {
          void jobsQuery.refetch()
          void typesQuery.refetch()
        }}
      />
    )
  }
  if (jobsQuery.isPending || typesQuery.isPending) return <HistorySkeleton />
  if (jobsQuery.data.length === 0) return <HistoryEmpty onNewExport={onNewExport} />

  const names = new Map(typesQuery.data.map((type) => [type.id, type.name]))
  const typeName = (job: ExportJob) => names.get(job.typeId) ?? DELETED_TYPE

  return (
    <>
      <div className="hidden md:block">
        <HistoryTable jobs={jobsQuery.data} typeName={typeName} />
      </div>
      <div className="md:hidden">
        <HistoryCards jobs={jobsQuery.data} typeName={typeName} />
      </div>
    </>
  )
}
