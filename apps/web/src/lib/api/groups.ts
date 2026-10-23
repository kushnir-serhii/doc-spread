import { useQuery } from '@tanstack/react-query'
import { listGroupValues } from '@/lib/mock'

export const groupKeys = {
  all: ['groups'] as const,
  values: (typeId: string, fieldId: string) =>
    [...groupKeys.all, typeId, fieldId] as const,
}

export const useGroupValues = (typeId: string, fieldId: string) =>
  useQuery({
    queryKey: groupKeys.values(typeId, fieldId),
    queryFn: () => listGroupValues(typeId, fieldId),
  })
