import { useDocumentsByIds, useDocumentTypes } from '@/lib/api'
import { deriveFileState } from './file-state'
import type { FileState } from './file-state'
import type { UploadEntry } from './upload-entries'

export interface UploadItem {
  id: string
  file: File
  state: FileState
}

/** Combines each file's client phase with its polled document; nothing is copied into local state. */
export const useFileStates = (entries: UploadEntry[]): UploadItem[] => {
  const types = useDocumentTypes()
  const documentIds = entries.flatMap((entry) => (entry.phase.kind === 'uploaded' ? [entry.phase.documentId] : []))
  const documents = useDocumentsByIds(documentIds)
  const typeName = (typeId: string) => types.data?.find((type) => type.id === typeId)?.name ?? 'Classified'

  return entries.map((entry) => {
    const index = entry.phase.kind === 'uploaded' ? documentIds.indexOf(entry.phase.documentId) : -1
    const query = index >= 0 ? documents[index] : undefined
    return {
      id: entry.id,
      file: entry.file,
      state: deriveFileState(entry.phase, { document: query?.data, error: query?.error ?? null }, typeName),
    }
  })
}
