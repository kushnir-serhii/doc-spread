import { skipToken, useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { notAvailableYet } from '@/lib/real/not-available'
import { listGroupings, listGroupValues } from '@/lib/mock'

/** Groups have no backend yet: with mocks off the calls fail with "not available yet" (the screens show that state instead). */
const noGroups = (): Promise<never> => Promise.reject(notAvailableYet('Groups'))

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
    queryFn: enabled ? () => (USE_MOCKS ? listGroupValues(typeId, fieldId) : noGroups()) : skipToken,
  })

export const useGroupings = () =>
  useQuery({
    queryKey: groupKeys.summaries(),
    queryFn: USE_MOCKS ? listGroupings : noGroups,
  })
