/** Mocks are on unless `VITE_USE_MOCKS` is exactly the string `'false'`. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export const BACKEND_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_API_BASE_URL',
] as const

type BackendEnvKey = (typeof BACKEND_ENV_KEYS)[number]

export type BackendEnv = Record<BackendEnvKey, string>

const readRequired = (key: BackendEnvKey): string => {
  const value: string | undefined = import.meta.env[key]
  if (!value) {
    throw new Error(
      `Missing env variable ${key}. Copy apps/web/.env.example to apps/web/.env.local and set it.`,
    )
  }
  return value
}

/** Reads the backend variables for a non-mock build. Throws naming the first missing one. */
export const readBackendEnv = (): BackendEnv => ({
  VITE_SUPABASE_URL: readRequired('VITE_SUPABASE_URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: readRequired('VITE_SUPABASE_PUBLISHABLE_KEY'),
  VITE_API_BASE_URL: readRequired('VITE_API_BASE_URL'),
})
