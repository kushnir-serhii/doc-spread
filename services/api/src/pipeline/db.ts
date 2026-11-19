import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Server-side client with the secret key (bypasses row-level security: the pipeline writes for the company). */
export const createAdminClient = (url: string, secretKey: string): SupabaseClient =>
  createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

export const failOn = (what: string, error: { message: string } | null): void => {
  if (error) throw new Error(`${what} failed: ${error.message}`)
}

/** A short message that is safe to show: no values, no keys. */
export const setDocumentError = async (supabase: SupabaseClient, documentId: string, message: string): Promise<void> => {
  const { error } = await supabase
    .from('documents')
    .update({ status: 'error', error_message: message.slice(0, 200) })
    .eq('id', documentId)
  failOn('set error status', error)
}
