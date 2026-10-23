import type { DocumentStatus } from '@/lib/mock/types'

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: 'Uploaded',
  processing: 'Processing',
  unclassified: 'Unclassified',
  needs_review: 'Needs review',
  approved: 'Approved',
  exported: 'Exported',
  rejected: 'Rejected',
  error: 'Error',
}
