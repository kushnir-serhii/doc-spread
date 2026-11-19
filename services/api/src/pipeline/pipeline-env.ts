import { readSecretFromSsm } from '../env.ts'

export interface PipelineEnv {
  supabaseUrl: string
  documentsBucket: string
  /** Bypasses row-level security. Never log it. */
  supabaseSecretKey: string
  /** Only the OCR handler needs it. */
  extractQueueUrl?: string
  /** Only the extract handler needs these. */
  anthropicApiKey?: string
  modelClassify?: string
  modelExtract?: string
  classifyMinConfidence?: number
}

type Source = Record<string, string | undefined>
type ReadSecret = (parameterName: string) => Promise<string>

const need = (source: Source, name: string): string => {
  const value = source[name]
  if (!value) throw new Error(`Missing env variable ${name}`)
  return value
}

const secret = async (source: Source, readSecret: ReadSecret, plain: string, param: string): Promise<string> => {
  const direct = source[plain]
  if (direct) return direct
  const paramName = source[param]
  if (!paramName) throw new Error(`Missing env variable ${plain} (or ${param})`)
  return readSecret(paramName)
}

/** Config shared by both pipeline handlers. Error messages carry variable names only. */
export const loadOcrEnv = async (source: Source = process.env, readSecret: ReadSecret = readSecretFromSsm): Promise<PipelineEnv> => ({
  supabaseUrl: need(source, 'SUPABASE_URL'),
  documentsBucket: need(source, 'S3_DOCUMENTS_BUCKET'),
  extractQueueUrl: need(source, 'EXTRACT_QUEUE_URL'),
  supabaseSecretKey: await secret(source, readSecret, 'SUPABASE_SECRET_KEY', 'SSM_SUPABASE_SECRET_KEY_PARAM'),
})

export const loadExtractEnv = async (source: Source = process.env, readSecret: ReadSecret = readSecretFromSsm): Promise<PipelineEnv> => {
  const classifyMinConfidence = Number(need(source, 'CLASSIFY_MIN_CONFIDENCE'))
  if (!(classifyMinConfidence >= 0 && classifyMinConfidence <= 1)) {
    throw new Error('Invalid env variable CLASSIFY_MIN_CONFIDENCE: expected a number from 0 to 1')
  }
  return {
    supabaseUrl: need(source, 'SUPABASE_URL'),
    documentsBucket: need(source, 'S3_DOCUMENTS_BUCKET'),
    modelClassify: need(source, 'ANTHROPIC_MODEL_CLASSIFY'),
    modelExtract: need(source, 'ANTHROPIC_MODEL_EXTRACT'),
    classifyMinConfidence,
    supabaseSecretKey: await secret(source, readSecret, 'SUPABASE_SECRET_KEY', 'SSM_SUPABASE_SECRET_KEY_PARAM'),
    anthropicApiKey: await secret(source, readSecret, 'ANTHROPIC_API_KEY', 'SSM_ANTHROPIC_API_KEY_PARAM'),
  }
}
