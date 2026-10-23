import { useQuery } from '@tanstack/react-query'
import { listTeam } from '@/lib/mock'

export const teamKeys = {
  all: ['team'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
}

export const useTeam = () =>
  useQuery({
    queryKey: teamKeys.list(),
    queryFn: listTeam,
  })
