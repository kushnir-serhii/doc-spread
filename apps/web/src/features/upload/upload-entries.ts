import { validateFile } from './upload-rules'

/** Client-side phase of a file; what happens to the document afterwards comes from the server. */
export type UploadPhase =
  | { kind: 'queued' }
  | { kind: 'uploading'; progress: number }
  | { kind: 'uploaded'; documentId: string }
  | { kind: 'failed'; reason: string }

export interface UploadEntry {
  id: string
  file: File
  phase: UploadPhase
}

export interface RejectedFile {
  id: string
  name: string
  size: number
  reason: string
}

export interface ClassifiedFiles {
  accepted: UploadEntry[]
  rejected: RejectedFile[]
}

export const classifyFiles = (files: File[]): ClassifiedFiles => {
  const accepted: UploadEntry[] = []
  const rejected: RejectedFile[] = []
  for (const file of files) {
    const result = validateFile(file)
    if (result.ok) {
      accepted.push({ id: crypto.randomUUID(), file, phase: { kind: 'queued' } })
    } else {
      rejected.push({ id: crypto.randomUUID(), name: file.name, size: file.size, reason: result.reason })
    }
  }
  return { accepted, rejected }
}

export const describeResult = ({ accepted, rejected }: ClassifiedFiles): string => {
  const parts: string[] = []
  if (accepted.length > 0) parts.push(`${accepted.length} ${accepted.length === 1 ? 'file' : 'files'} added`)
  if (rejected.length > 0) parts.push(`${rejected.length} rejected`)
  return parts.join(', ')
}
