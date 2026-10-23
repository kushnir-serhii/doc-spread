import { validateFile } from './upload-rules'

/** Slice 2 extends this union: uploading | processing | classified | unclassified | failed. */
export type UploadEntry = { id: string; file: File; status: 'queued' }

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
      accepted.push({ id: crypto.randomUUID(), file, status: 'queued' })
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
