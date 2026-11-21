import { useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { notAvailableYet } from '@/lib/real/not-available'
import { getPlanUsage } from '@/lib/mock'

export const planKeys = {
  all: ['plan'] as const,
  usage: () => [...planKeys.all, 'usage'] as const,
}

export const usePlan = () =>
  useQuery({
    queryKey: planKeys.usage(),
    queryFn: USE_MOCKS ? getPlanUsage : () => Promise.reject(notAvailableYet('The plan')),
  })
