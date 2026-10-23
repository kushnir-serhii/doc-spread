export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(',')

export type FileValidation = { ok: true } | { ok: false; reason: string }

const hasAcceptedExtension = (name: string) => {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export const validateFile = (file: File): FileValidation => {
  if (!hasAcceptedExtension(file.name)) return { ok: false, reason: 'Only PDF, JPG or PNG' }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'Larger than 20 MB' }
  if (file.size === 0) return { ok: false, reason: 'The file is empty' }
  return { ok: true }
}
