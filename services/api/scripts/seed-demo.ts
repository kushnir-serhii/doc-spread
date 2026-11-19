// Demo data for the dev project (idempotent): a login, "Demo Company" (USD) and an Invoice type.
// Reads services/api/.env.local; the login's password is appended there and never printed.
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { API_ENV_FILE, appendEnvValues, readEnvFile, requireValue } from './env-file.ts'

const DEMO_EMAIL = 'demo@docspread.dev'
const COMPANY_NAME = 'Demo Company'
const TYPE_NAME = 'Invoice'

interface InvoiceTemplate {
  description: string
  fields: unknown[]
  actions: unknown[]
  titleFieldId: string
  listColumnIds: string[]
}
// Generated from the invoice template in apps/web/src/lib/mock/templates.ts (document_type_versions columns).
const template: InvoiceTemplate = JSON.parse(
  readFileSync(new URL('./invoice-template.json', import.meta.url), 'utf8'),
) // our own generated file

const env = readEnvFile(API_ENV_FILE)
const supabase = createClient(requireValue(env, 'SUPABASE_URL', '.env.local'), requireValue(env, 'SUPABASE_SECRET_KEY', '.env.local'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

const fail = (what: string, message: string): never => {
  throw new Error(`${what}: ${message}`)
}

const findUserId = async (client: SupabaseClient): Promise<string | undefined> => {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return fail('list users', error.message)
    const user = data.users.find((candidate) => candidate.email === DEMO_EMAIL)
    if (user) return user.id
    if (data.users.length < 200) return undefined
  }
  return undefined
}

const ensureUser = async (): Promise<string> => {
  const existing = await findUserId(supabase)
  const passwordKnown = Boolean(env.DEMO_USER_PASSWORD)
  if (existing && passwordKnown) return existing
  // Created now, or exists but the password was never saved locally: set a fresh random one.
  const password = randomBytes(24).toString('base64url')
  let userId = existing
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing, { password })
    if (error) return fail('update user', error.message)
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email: DEMO_EMAIL, password, email_confirm: true })
    if (error) return fail('create user', error.message)
    userId = data.user.id
  }
  appendEnvValues(API_ENV_FILE, {
    ...(env.DEMO_USER_EMAIL ? {} : { DEMO_USER_EMAIL: DEMO_EMAIL }),
    DEMO_USER_PASSWORD: password,
  })
  return userId ?? fail('user', 'no id')
}

const ensureCompany = async (userId: string): Promise<string> => {
  const { data: members, error } = await supabase
    .from('team_members')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) return fail('membership lookup', error.message)
  const existing = members[0]?.company_id
  if (typeof existing === 'string') return existing

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: COMPANY_NAME, default_currency: 'USD', locale: null })
    .select('id')
    .single()
  if (companyError) return fail('create company', companyError.message)
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ company_id: company.id, user_id: userId, name: 'Demo User', email: DEMO_EMAIL, role: 'owner', status: 'active' })
  if (memberError) return fail('create owner', memberError.message)
  return company.id
}

const ensureInvoiceType = async (companyId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('document_types')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', TYPE_NAME)
    .limit(1)
  if (error) return fail('type lookup', error.message)
  if (data.length > 0) return
  const { data: type, error: typeError } = await supabase
    .from('document_types')
    .insert({ company_id: companyId, name: TYPE_NAME, description: template.description, current_version: 1 })
    .select('id')
    .single()
  if (typeError) return fail('create type', typeError.message)
  const { error: versionError } = await supabase.from('document_type_versions').insert({
    type_id: type.id,
    version: 1,
    company_id: companyId,
    fields: template.fields,
    actions: template.actions,
    title_field_id: template.titleFieldId,
    list_column_ids: template.listColumnIds,
  })
  if (versionError) return fail('create type version', versionError.message)
}

const userId = await ensureUser()
await ensureInvoiceType(await ensureCompany(userId))
console.log('demo user ready')
