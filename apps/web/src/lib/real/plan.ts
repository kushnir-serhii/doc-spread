import type { PlanUsage } from '@/lib/mock/types'
import { getCompanyId } from './company-id'
import { getSupabase } from './client'

/** The Free limit (spec 011, 031): used while `companies.monthly_document_limit` can't be read (the migration isn't there yet). */
const FREE_DOCUMENTS_PER_MONTH = 10

/** The company's limit under RLS, or the Free limit when the column is missing or can't be read. */
const readLimit = async (companyId: string): Promise<number> => {
  const { data, error } = await getSupabase().from('companies').select('monthly_document_limit').eq('id', companyId).maybeSingle()
  if (error || !data) return FREE_DOCUMENTS_PER_MONTH
  const limit: unknown = data.monthly_document_limit
  return typeof limit === 'number' && limit > 0 ? limit : FREE_DOCUMENTS_PER_MONTH
}

/** Usage of the current calendar month (UTC): the limit, this month's documents by `uploaded_at`, and the number of types. */
export const getPlanUsage = async (): Promise<PlanUsage> => {
  const supabase = getSupabase()
  const companyId = await getCompanyId()
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const [limit, documents, types] = await Promise.all([
    readLimit(companyId),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('uploaded_at', periodStart),
    supabase.from('document_types').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
  ])
  if (documents.error) throw new Error(`Couldn't load your usage: ${documents.error.message}`)
  if (types.error) throw new Error(`Couldn't load your usage: ${types.error.message}`)
  return {
    plan: { id: 'free', name: 'Free', documentsPerMonth: limit, typeLimit: null },
    documentsThisMonth: documents.count ?? 0,
    types: types.count ?? 0,
    periodStart,
  }
}
