import { formatDate } from '@/lib/mock/format'
import type { ExportJob } from '@/lib/mock/types'

export const DELETED_TYPE = 'Deleted type'

/** date + time in `locale` (undefined: the browser's) */
export const jobDate = (job: ExportJob, locale?: string): string =>
  formatDate(job.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })

export const jobDestination = (job: ExportJob): string =>
  job.destination === 'email' ? `Email · ${job.recipient ?? 'unknown recipient'}` : 'Download'
