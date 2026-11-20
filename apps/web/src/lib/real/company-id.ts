import { getSupabase } from './client'

/** The caller's company id: the first active membership by creation order (the same rule as the API). */
export const getCompanyId = async (): Promise<string> => {
  const { data, error } = await getSupabase()
    .from('team_members')
    .select('company_id')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw new Error(`membership lookup failed: ${error.message}`)
  const companyId = data[0]?.company_id
  if (typeof companyId !== 'string') throw new Error('The user belongs to no company')
  return companyId
}
