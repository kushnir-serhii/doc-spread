import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { notAvailableYet } from '@/lib/real/not-available'
import { inviteTeamMember, listTeam } from '@/lib/mock'

export const teamKeys = {
  all: ['team'] as const,
  list: () => [...teamKeys.all, 'list'] as const,
}

export const useTeam = () =>
  useQuery({
    queryKey: teamKeys.list(),
    queryFn: USE_MOCKS ? listTeam : () => Promise.reject(notAvailableYet('The team')),
  })

export const useInviteMember = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: USE_MOCKS ? inviteTeamMember : () => Promise.reject(notAvailableYet('Inviting a member')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  })
}
