import { DOCUMENT_STATUSES } from '@/lib/mock/types'
import type { DocumentStatus, DocumentType, ListDocumentsParams } from '@/lib/mock/types'

export const UNCLASSIFIED = 'unclassified'

export type InboxView = { kind: 'all' } | { kind: 'unclassified' } | { kind: 'type'; type: DocumentType }

/** An unknown ?type= (or types still loading) falls back to All. */
export const resolveView = (typeParam: string | null, types: DocumentType[]): InboxView => {
  if (typeParam === UNCLASSIFIED) return { kind: 'unclassified' }
  const type = typeParam ? types.find((candidate) => candidate.id === typeParam) : undefined
  return type ? { kind: 'type', type } : { kind: 'all' }
}

export interface InboxFilters {
  status?: DocumentStatus
  search: string
}

/** An invalid ?status= is ignored. */
export const parseStatus = (param: string | null): DocumentStatus | undefined =>
  DOCUMENT_STATUSES.find((status) => status === param)

/** The Unclassified view fixes the status, so the status filter does not apply there. */
export const effectiveFilters = (view: InboxView, filters: InboxFilters): InboxFilters =>
  view.kind === 'unclassified' ? { search: filters.search } : filters

export const buildListParams = (view: InboxView, filters: InboxFilters): ListDocumentsParams => {
  const { status, search } = effectiveFilters(view, filters)
  const base: ListDocumentsParams = { ...(status && { status }), ...(search && { search }) }
  switch (view.kind) {
    case 'all':
      return base
    case 'unclassified':
      return { ...base, status: 'unclassified' }
    case 'type':
      return { ...base, typeId: view.type.id }
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}
