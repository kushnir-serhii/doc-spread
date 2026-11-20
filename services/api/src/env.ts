export interface Env {
  supabaseUrl: string
  supabaseJwksUrl: string
  documentsBucket: string
  uploadMaxBytes: number
  /** Bypasses row-level security. Never log it. */
  supabaseSecretKey: string
}

type Source = Record<string, string | undefined>

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_JWKS_URL',
  'SUPABASE_SECRET_KEY',
  'STORAGE_DOCUMENTS_BUCKET',
  'UPLOAD_MAX_BYTES',
] as const

/**
 * Reads the required configuration from the environment (Vercel env or `.env.local`) and throws
 * `Missing env variable X` for the first one that is absent. Error messages carry variable names only.
 */
export const loadEnv = (source: Source = process.env): Env => {
  for (const name of REQUIRED) {
    if (!source[name]) throw new Error(`Missing env variable ${name}`)
  }
  const uploadMaxBytes = Number(source.UPLOAD_MAX_BYTES)
  if (!Number.isInteger(uploadMaxBytes) || uploadMaxBytes < 1) {
    throw new Error('Invalid env variable UPLOAD_MAX_BYTES: expected a positive integer')
  }
  return {
    supabaseUrl: source.SUPABASE_URL ?? '',
    supabaseJwksUrl: source.SUPABASE_JWKS_URL ?? '',
    documentsBucket: source.STORAGE_DOCUMENTS_BUCKET ?? '',
    uploadMaxBytes,
    supabaseSecretKey: source.SUPABASE_SECRET_KEY ?? '',
  }
}
