export interface PipelineEnv {
  supabaseUrl: string
  /** Bypasses row-level security. Never log it. */
  supabaseSecretKey: string
  documentsBucket: string
  /** Never log it. */
  anthropicApiKey: string
  modelClassify: string
  modelExtract: string
  classifyMinConfidence: number
}

type Source = Record<string, string | undefined>

const need = (source: Source, name: string): string => {
  const value = source[name]
  if (!value) throw new Error(`Missing env variable ${name}`)
  return value
}

/**
 * Config of both pipeline functions, read from the environment (Vercel env or `.env.local`) on the first request.
 * `PIPELINE_SECRET` is checked by `pipeline-auth.ts` before this runs. Error messages carry variable names only.
 */
export const loadPipelineEnv = (source: Source = process.env): PipelineEnv => {
  const classifyMinConfidence = Number(need(source, 'CLASSIFY_MIN_CONFIDENCE'))
  if (!(classifyMinConfidence >= 0 && classifyMinConfidence <= 1)) {
    throw new Error('Invalid env variable CLASSIFY_MIN_CONFIDENCE: expected a number from 0 to 1')
  }
  return {
    supabaseUrl: need(source, 'SUPABASE_URL'),
    supabaseSecretKey: need(source, 'SUPABASE_SECRET_KEY'),
    documentsBucket: need(source, 'STORAGE_DOCUMENTS_BUCKET'),
    anthropicApiKey: need(source, 'ANTHROPIC_API_KEY'),
    modelClassify: need(source, 'ANTHROPIC_MODEL_CLASSIFY'),
    modelExtract: need(source, 'ANTHROPIC_MODEL_EXTRACT'),
    classifyMinConfidence,
  }
}
