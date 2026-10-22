import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCompany, updateCompany } from '@/lib/mock'
import type { Company } from '@/lib/mock/types'

export const companyKeys = {
  all: ['company'] as const,
  detail: () => [...companyKeys.all, 'detail'] as const,
}

export const useCompany = () =>
  useQuery({
    queryKey: companyKeys.detail(),
    queryFn: getCompany,
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
