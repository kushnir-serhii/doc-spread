import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'

export interface Env {
  supabaseUrl: string
  supabaseJwksUrl: string
  documentsBucket: string
  uploadMaxBytes: number
  /** Bypasses row-level security. Never log it. */
  supabaseSecretKey: string
}

type Source = Record<string, string | undefined>

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_JWKS_URL', 'S3_DOCUMENTS_BUCKET', 'UPLOAD_MAX_BYTES'] as const

export const readSecretFromSsm = async (parameterName: string): Promise<string> => {
  const result = await new SSMClient({}).send(new GetParameterCommand({ Name: parameterName, WithDecryption: true }))
  const value = result.Parameter?.Value
  if (!value) throw new Error(`SSM parameter ${parameterName} is empty`)
  return value
}

/**
 * Reads the required configuration and throws `Missing env variable X` for the first one that is absent.
 * The Supabase secret comes from SUPABASE_SECRET_KEY (local) or from SSM through
 * SSM_SUPABASE_SECRET_KEY_PARAM (Lambda). Error messages only ever carry variable names, never values.
 */
export const loadEnv = async (
  source: Source = process.env,
  readSecret: (parameterName: string) => Promise<string> = readSecretFromSsm,
): Promise<Env> => {
  for (const name of REQUIRED) {
    if (!source[name]) throw new Error(`Missing env variable ${name}`)
  }
  const secretParam = source.SSM_SUPABASE_SECRET_KEY_PARAM
  if (!source.SUPABASE_SECRET_KEY && !secretParam) {
    throw new Error('Missing env variable SUPABASE_SECRET_KEY (or SSM_SUPABASE_SECRET_KEY_PARAM)')
  }
  const uploadMaxBytes = Number(source.UPLOAD_MAX_BYTES)
  if (!Number.isInteger(uploadMaxBytes) || uploadMaxBytes < 1) {
    throw new Error('Invalid env variable UPLOAD_MAX_BYTES: expected a positive integer')
  }
  const supabaseSecretKey = source.SUPABASE_SECRET_KEY ?? (await readSecret(secretParam ?? ''))
  return {
    supabaseUrl: source.SUPABASE_URL ?? '',
    supabaseJwksUrl: source.SUPABASE_JWKS_URL ?? '',
    documentsBucket: source.S3_DOCUMENTS_BUCKET ?? '',
    uploadMaxBytes,
    supabaseSecretKey,
  }
}

let cached: Promise<Env> | undefined

/** One load per container. */
export const getEnv = (): Promise<Env> => {
  cached ??= loadEnv()
  return cached
}
