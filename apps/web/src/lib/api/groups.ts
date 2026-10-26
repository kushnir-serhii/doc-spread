import { skipToken, useQuery } from '@tanstack/react-query'
import { listGroupings, listGroupValues } from '@/lib/mock'

export const groupKeys = {
  all: ['groups'] as const,
  summaries: () => [...groupKeys.all, 'summaries'] as const,
  values: (typeId: string, fieldId: string) =>
    [...groupKeys.all, typeId, fieldId] as const,
}

/** `enabled: false` skips the request, e.g. while the type or field is not valid. */
export const useGroupValues = (typeId: string, fieldId: string, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: groupKeys.values(typeId, fieldId),
    queryFn: enabled ? () => listGroupValues(typeId, fieldId) : skipToken,
  })

export const useGroupings = () =>
  useQuery({
    queryKey: groupKeys.summaries(),
    queryFn: listGroupings,
  })
