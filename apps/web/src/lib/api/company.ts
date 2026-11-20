import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { getCompany as mockGetCompany, updateCompany } from '@/lib/mock'
import { getCompany as realGetCompany } from '@/lib/real/auth'
import type { Company } from '@/lib/mock/types'

export const companyKeys = {
  all: ['company'] as const,
  detail: () => [...companyKeys.all, 'detail'] as const,
}

export const useCompany = () =>
  useQuery({
    queryKey: companyKeys.detail(),
    queryFn: USE_MOCKS ? mockGetCompany : realGetCompany,
  })

export const useUpdateCompany = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Company>) => updateCompany(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(companyKeys.detail(), data)
      return queryClient.invalidateQueries({ queryKey: companyKeys.all })
    },
  })
}
