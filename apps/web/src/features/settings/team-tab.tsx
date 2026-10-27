import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTeam } from '@/lib/api'
import { InviteForm } from './invite-form'
import { TeamMemberCards } from './team-member-cards'
import { TeamMembersTable } from './team-members-table'

export const TeamTab = () => {
  const team = useTeam()

  if (team.isPending) {
    return (
      <div role="status" aria-label="Loading team" className="flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (team.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p>Could not load your team.</p>
        <Button type="button" variant="outline" className="min-h-touch md:min-h-9" onClick={() => void team.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <TeamMembersTable members={team.data} />
      <TeamMemberCards members={team.data} />
      <div className="max-w-xl">
        <InviteForm members={team.data} />
      </div>
    </div>
  )
}
