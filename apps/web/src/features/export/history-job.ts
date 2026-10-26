import { formatDate } from '@/lib/mock/format'
import type { ExportJob } from '@/lib/mock/types'

export const DELETED_TYPE = 'Deleted type'

/** date + time in the browser locale */
export const jobDate = (job: ExportJob): string =>
  formatDate(job.createdAt, undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const jobDestination = (job: ExportJob): string =>
  job.destination === 'email' ? `Email · ${job.recipient ?? 'unknown recipient'}` : 'Download'
