import type { DocumentType, ListDocumentsParams } from '@/lib/mock/types'

export const UNCLASSIFIED = 'unclassified'

export type InboxView = { kind: 'all' } | { kind: 'unclassified' } | { kind: 'type'; type: DocumentType }

/** An unknown ?type= (or types still loading) falls back to All. */
export const resolveView = (typeParam: string | null, types: DocumentType[]): InboxView => {
  if (typeParam === UNCLASSIFIED) return { kind: 'unclassified' }
  const type = typeParam ? types.find((candidate) => candidate.id === typeParam) : undefined
  return type ? { kind: 'type', type } : { kind: 'all' }
}

/** Slice 3 adds status and search here. */
export const buildListParams = (view: InboxView): ListDocumentsParams => {
  switch (view.kind) {
    case 'all':
      return {}
    case 'unclassified':
      return { status: 'unclassified' }
    case 'type':
      return { typeId: view.type.id }
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}
