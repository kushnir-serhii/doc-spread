import type { SupabaseClient } from '@supabase/supabase-js'

/** Validated sign-up input: the company name is trimmed, the email too. */
export interface SignupRequest {
  companyName: string
  email: string
  password: string
}

export type SignupValidation = { ok: true; value: SignupRequest } | { ok: false; code: string; message: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim, collapse inner whitespace, lowercase. The same rule as the unique index `companies_name_normalized_key`. */
export const normalizeCompanyName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase()

export const validateSignup = (body: unknown): SignupValidation => {
  if (typeof body !== 'object' || body === null) return { ok: false, code: 'invalid_body', message: 'Send a JSON object' }
  const { companyName, email, password } = body as Record<string, unknown> // narrowed field by field below
  if (typeof companyName !== 'string' || companyName.trim().length < 2 || companyName.trim().length > 100) {
    return { ok: false, code: 'invalid_company_name', message: 'companyName must be 2 to 100 characters' }
  }
  if (typeof email !== 'string' || email.trim().length > 254 || !EMAIL.test(email.trim())) {
    return { ok: false, code: 'invalid_email', message: 'email is not valid' }
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    return { ok: false, code: 'invalid_password', message: 'password must be at least 8 characters' }
  }
  return { ok: true, value: { companyName: companyName.trim(), email: email.trim(), password } }
}

export class SignupError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** `%` and `_` are wildcards in `ilike`; `\` escapes them. */
const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (char) => `\\${char}`)

/** Is there a company whose normalized name equals this one? (The index is the final guard against races.) */
const companyNameTaken = async (supabase: SupabaseClient, normalized: string): Promise<boolean> => {
  const pattern = `%${normalized.split(' ').map(escapeLike).join('%')}%`
  const { data, error } = await supabase.from('companies').select('name').ilike('name', pattern).limit(100)
  if (error) throw new Error(`company lookup failed: ${error.message}`)
  return data.some((row) => typeof row.name === 'string' && normalizeCompanyName(row.name) === normalized)
}

/**
 * Creates a user (email already confirmed), their company (currency USD, no locale) and an active owner membership.
 * What was created is removed again if a later step fails. Never logs the password.
 */
export const signup = async (supabase: SupabaseClient, input: SignupRequest): Promise<{ userId: string; companyId: string }> => {
  const normalized = normalizeCompanyName(input.companyName)
  if (await companyNameTaken(supabase, normalized)) throw new SignupError(409, 'company_taken', 'A company with this name already exists')

  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (userError) {
    if (userError.code === 'email_exists') throw new SignupError(409, 'email_taken', 'This email is already registered')
    throw new Error(`user creation failed: ${userError.code ?? userError.status ?? 'unknown'}`)
  }
  const userId = created.user.id

  let companyId: string | undefined
  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: input.companyName.replace(/\s+/g, ' '), default_currency: 'USD' })
      .select('id')
      .single()
    if (companyError) {
      // 23505: the unique index on the normalized name caught a parallel sign-up
      if (companyError.code === '23505') throw new SignupError(409, 'company_taken', 'A company with this name already exists')
      throw new Error(`company insert failed: ${companyError.message}`)
    }
    companyId = company.id
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ company_id: company.id, user_id: userId, email: input.email, role: 'owner', status: 'active' })
    if (memberError) throw new Error(`membership insert failed: ${memberError.message}`)
    return { userId, companyId: company.id }
  } catch (failure) {
    if (companyId) await supabase.from('companies').delete().eq('id', companyId) // cascades to the membership
    await supabase.auth.admin.deleteUser(userId)
    throw failure
  }
}
