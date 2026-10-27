import type { TeamMember } from '@/lib/mock/types'
import { MemberPendingBadge } from './member-pending-badge'
import { RoleBadge } from './role-badge'

export interface TeamMemberCardsProps {
  members: TeamMember[]
}

/** Mobile list (below `sm`). */
export const TeamMemberCards = ({ members }: TeamMemberCardsProps) => (
  <ul className="divide-y rounded-md border bg-card sm:hidden">
    {members.map((member) => (
      <li key={member.id} className="flex flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={member.name ?? member.email}>
            {member.name ?? member.email}
          </p>
          {member.name !== null && (
            <p className="truncate text-sm text-muted-foreground" title={member.email}>
              {member.email}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />
          <MemberPendingBadge status={member.status} />
        </div>
      </li>
    ))}
  </ul>
)
