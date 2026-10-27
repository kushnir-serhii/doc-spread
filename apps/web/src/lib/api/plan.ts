import { useQuery } from '@tanstack/react-query'
import { getPlanUsage } from '@/lib/mock'

export const planKeys = {
  all: ['plan'] as const,
  usage: () => [...planKeys.all, 'usage'] as const,
}

export const usePlan = () =>
  useQuery({
    queryKey: planKeys.usage(),
    queryFn: getPlanUsage,
  })
