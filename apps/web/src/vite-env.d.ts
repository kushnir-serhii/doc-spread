// `vite/client` types come from tsconfig.app.json `types`, so only the app's own variables are declared here.
interface ImportMetaEnv {
  readonly VITE_USE_MOCKS?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_API_BASE_URL?: string
}
