import type { Session } from '@supabase/supabase-js'
import { DEFAULT_CURRENCY } from '@/lib/fields/default-currency'
import { AuthError, CURRENCIES } from '@/lib/mock/types'
import type { Company, CurrencyCode, Recipient } from '@/lib/mock/types'
import { ApiError, apiFetch } from './api-fetch'
import { getSupabase } from './client'
import { getCompanyId } from './company-id'

const isRateLimited = (status: number | undefined, code: string | undefined): boolean =>
  status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit'

export const signIn = async (input: { email: string; password: string }): Promise<{ email: string }> => {
  const { data, error } = await getSupabase().auth.signInWithPassword(input)
  if (error) {
    if (isRateLimited(error.status, error.code)) throw new AuthError('rate_limited')
    if (error.status === 400 || error.code === 'invalid_credentials') throw new AuthError('invalid_credentials')
    throw error
  }
  return { email: data.user.email ?? input.email }
}

/** Creates the user, the company and the owner through the API, then signs in (the email is already confirmed). */
export const signUp = async (input: { companyName: string; email: string; password: string }): Promise<{ email: string }> => {
  try {
    await apiFetch('/signup', { body: input })
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'company_taken') throw new AuthError('company_taken')
      if (error.code === 'email_taken') throw new AuthError('email_taken')
      if (error.status === 429) throw new AuthError('rate_limited')
    }
    throw error
  }
  return signIn({ email: input.email, password: input.password })
}

export const signOut = async (): Promise<void> => {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw error
}

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw error
  return data.session
}

/** Calls `listener` on every sign-in, sign-out and token refresh; returns the unsubscribe function. */
export const onSessionChange = (listener: (session: Session | null) => void): (() => void) => {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => listener(session))
  return () => data.subscription.unsubscribe()
}

// The web type lists 5 currencies (spec 020/023 open question); anything else falls back to the default for now.
const toCurrency = (value: unknown): CurrencyCode => CURRENCIES.find((code) => code === value) ?? DEFAULT_CURRENCY

const toRecipients = (value: unknown): Recipient[] => (Array.isArray(value) ? (value as Recipient[]) : []) // jsonb written by the app in this shape

/** The caller's company (see `getCompanyId`). */
export const getCompany = async (): Promise<Company> => {
  const supabase = getSupabase()
  const companyId = await getCompanyId()
  const { data: row, error: companyError } = await supabase
    .from('companies')
    .select('name, tax_id, recipients, default_currency, locale')
    .eq('id', companyId)
    .single()
  if (companyError) throw new Error(`company lookup failed: ${companyError.message}`)
  return {
    name: row.name,
    taxId: row.tax_id,
    recipients: toRecipients(row.recipients),
    defaultCurrency: toCurrency(row.default_currency),
    locale: typeof row.locale === 'string' ? row.locale : null,
  }
}
