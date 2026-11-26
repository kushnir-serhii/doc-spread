import { useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { getPlanUsage as mockGetPlanUsage } from '@/lib/mock'
import { getPlanUsage as realGetPlanUsage } from '@/lib/real/plan'

export const planKeys = {
  all: ['plan'] as const,
  usage: () => [...planKeys.all, 'usage'] as const,
}

export const usePlan = () =>
  useQuery({
    queryKey: planKeys.usage(),
    queryFn: USE_MOCKS ? mockGetPlanUsage : realGetPlanUsage,
  })
