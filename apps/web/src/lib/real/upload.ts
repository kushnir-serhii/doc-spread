import type { Document, FileType } from '@/lib/mock/types'
import { ApiError, apiFetch } from './api-fetch'
import { getDocument } from './documents'

export interface UploadOptions {
  /** Not used yet: the API classifies every upload (a fixed type is a later feature). */
  typeId?: string
  /** called with 0..1 while the bytes go to Storage */
  onProgress?: (fraction: number) => void
}

const FILE_TYPE_BY_EXTENSION: Record<string, FileType | undefined> = { pdf: 'pdf', jpg: 'jpg', jpeg: 'jpg', png: 'png' }
const CONTENT_TYPES: Record<FileType, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' }

/** The messages the upload list already uses for the same problems. */
const ERROR_MESSAGES: Record<string, string> = {
  file_too_large: 'Larger than 20 MB',
  file_type_not_allowed: 'Only PDF, JPG or PNG',
  content_type_mismatch: 'Only PDF, JPG or PNG',
  invalid_size: 'The file is empty',
  limit_reached: 'Monthly limit reached',
}

const asUploadError = (error: unknown): Error => {
  if (error instanceof ApiError) return new Error(ERROR_MESSAGES[error.code] ?? error.message)
  return error instanceof Error ? error : new Error('Upload failed')
}

interface CreatedUpload {
  documentId: string
  upload: { url: string }
}

const isCreatedUpload = (body: unknown): body is CreatedUpload =>
  typeof body === 'object' &&
  body !== null &&
  'documentId' in body &&
  typeof body.documentId === 'string' &&
  'upload' in body &&
  typeof body.upload === 'object' &&
  body.upload !== null &&
  'url' in body.upload &&
  typeof body.upload.url === 'string'

/** PUT to the signed URL the way supabase-js does (multipart, file in the unnamed part), with progress events. */
const putWithProgress = (url: string, file: File, onProgress?: (fraction: number) => void): Promise<void> =>
  new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('cacheControl', '3600')
    form.append('', file)
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(event.loaded / event.total, 0.99))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error('Upload failed: network error'))
    xhr.send(form)
  })

/** Creates the document through the API, sends the bytes to Storage, then completes it (the pipeline starts). */
export const uploadDocument = async (file: File, { onProgress }: UploadOptions = {}): Promise<Document> => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fileType = FILE_TYPE_BY_EXTENSION[extension]
  if (!fileType) throw new Error('Only PDF, JPG or PNG')
  try {
    const created = await apiFetch('/uploads', {
      body: { fileName: file.name, fileType, contentType: CONTENT_TYPES[fileType], size: file.size },
    })
    if (!isCreatedUpload(created)) throw new Error('Unexpected response from the upload API')
    await putWithProgress(created.upload.url, file, onProgress)
    await apiFetch(`/uploads/${created.documentId}/complete`, { method: 'POST' })
    onProgress?.(1)
    return await getDocument(created.documentId)
  } catch (error) {
    throw asUploadError(error)
  }
}
