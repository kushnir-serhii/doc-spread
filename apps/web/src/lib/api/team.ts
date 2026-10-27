import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inviteTeamMember, listTeam } from '@/lib/mock'

export const teamKeys = {
  all: ['team'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
}

export const useTeam = () =>
  useQuery({
    queryKey: teamKeys.list(),
    queryFn: listTeam,
  })

export const useInviteMember = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}
