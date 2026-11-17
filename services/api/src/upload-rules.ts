/** Accepted file types and their MIME types (spec 007). */
export const FILE_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
} as const

export type FileType = keyof typeof FILE_TYPES

export const isFileType = (value: unknown): value is FileType =>
  typeof value === 'string' && Object.hasOwn(FILE_TYPES, value)

/** Keeps letters, digits, dot, dash, underscore and space; everything else (path separators too) becomes `_`. */
export const sanitizeFileName = (name: string): string => {
  const cleaned = name
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[. ]+/, '')
    .trim()
    .slice(-100)
  return cleaned === '' ? 'file' : cleaned
}

export interface UploadRequest {
  fileName: string
  fileType: FileType
  size: number
  contentType: string
}

export type UploadValidation = { ok: true; value: UploadRequest } | { ok: false; code: string; message: string }

export const validateUpload = (body: unknown, maxBytes: number): UploadValidation => {
  if (typeof body !== 'object' || body === null) return { ok: false, code: 'invalid_body', message: 'Send a JSON object' }
  const { fileName, fileType, size, contentType } = body as Record<string, unknown> // narrowed field by field below
  if (typeof fileName !== 'string' || fileName.trim() === '') {
    return { ok: false, code: 'invalid_file_name', message: 'fileName is required' }
  }
  if (!isFileType(fileType)) {
    return { ok: false, code: 'file_type_not_allowed', message: 'Only PDF, JPG or PNG files are accepted' }
  }
  if (contentType !== FILE_TYPES[fileType]) {
    return { ok: false, code: 'content_type_mismatch', message: `contentType must be ${FILE_TYPES[fileType]} for ${fileType}` }
  }
  if (typeof size !== 'number' || !Number.isInteger(size) || size < 1) {
    return { ok: false, code: 'invalid_size', message: 'size must be a positive integer (bytes)' }
  }
  if (size > maxBytes) {
    return { ok: false, code: 'file_too_large', message: `File is larger than ${maxBytes} bytes` }
  }
  return { ok: true, value: { fileName: fileName.trim().slice(0, 255), fileType, size, contentType: FILE_TYPES[fileType] } }
}
