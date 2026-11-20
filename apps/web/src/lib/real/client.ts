import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readBackendEnv } from '@/lib/env'

let client: SupabaseClient | undefined

/** The one browser client (publishable key, session in localStorage, tokens refreshed automatically). Built on first use. */
export const getSupabase = (): SupabaseClient => {
  if (!client) {
    const env = readBackendEnv()
    client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}
