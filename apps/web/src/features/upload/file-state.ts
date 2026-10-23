import type { Document } from '@/lib/mock/types'
import type { UploadPhase } from './upload-entries'

/** What a row shows: the client phase combined with the document's server status. */
export type FileState =
  | { kind: 'queued' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'processing' }
  | { kind: 'classified'; typeName: string; documentId: string }
  | { kind: 'unclassified'; documentId: string }
  | { kind: 'failed'; reason: string }

interface DocumentLookup {
  document: Document | undefined
  error: Error | null
}

const fromDocument = (
  documentId: string,
  { document, error }: DocumentLookup,
  typeName: (typeId: string) => string,
): FileState => {
  if (!document) return error ? { kind: 'failed', reason: "Couldn't check the status" } : { kind: 'processing' }
  switch (document.status) {
    case 'uploaded':
    case 'processing':
      return { kind: 'processing' }
    case 'unclassified':
      return { kind: 'unclassified', documentId }
    case 'error':
      return { kind: 'failed', reason: document.errorMessage ?? 'Processing failed' }
    case 'needs_review':
    case 'approved':
    case 'exported':
    case 'rejected':
      return document.typeId
        ? { kind: 'classified', typeName: typeName(document.typeId), documentId }
        : { kind: 'unclassified', documentId }
    default: {
      const unreachable: never = document.status
      return unreachable
    }
  }
}

export const deriveFileState = (
  phase: UploadPhase,
  lookup: DocumentLookup,
  typeName: (typeId: string) => string,
): FileState => {
  switch (phase.kind) {
    case 'queued':
    case 'uploading':
    case 'failed':
      return phase
    case 'uploaded':
      return fromDocument(phase.documentId, lookup, typeName)
    default: {
      const unreachable: never = phase
      return unreachable
    }
  }
}

export interface FileCounts {
  total: number
  inProgress: number
  classified: number
  unclassified: number
  failed: number
}

export const countStates = (states: FileState[]): FileCounts => {
  const counts: FileCounts = { total: states.length, inProgress: 0, classified: 0, unclassified: 0, failed: 0 }
  for (const state of states) {
    switch (state.kind) {
      case 'queued':
      case 'uploading':
      case 'processing':
        counts.inProgress++
        break
      case 'classified':
        counts.classified++
        break
      case 'unclassified':
        counts.unclassified++
        break
      case 'failed':
        counts.failed++
        break
      default: {
        const unreachable: never = state
        return unreachable
      }
    }
  }
  return counts
}

export const describeCounts = ({ total, inProgress, classified, unclassified, failed }: FileCounts): string => {
  if (total === 0) return ''
  const parts: string[] = []
  if (classified > 0) parts.push(`${classified} classified`)
  if (unclassified > 0) parts.push(`${unclassified} unclassified`)
  if (failed > 0) parts.push(`${failed} failed`)
  if (inProgress > 0) parts.push(`${inProgress} in progress`)
  return parts.join(', ')
}
