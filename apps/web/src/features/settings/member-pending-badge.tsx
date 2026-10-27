import { Clock } from 'lucide-react'
import type { TeamMemberStatus } from '@/lib/mock/types'

export interface MemberPendingBadgeProps {
  status: TeamMemberStatus
}

/** "Pending" pill for invited members; active members show "Active" as plain text. */
export const MemberPendingBadge = ({ status }: MemberPendingBadgeProps) => {
  switch (status) {
    case 'invited':
      return (
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          Pending
        </span>
      )
    case 'active':
      return <span className="text-sm text-muted-foreground">Active</span>
    default: {
      const unreachable: never = status
      return unreachable
    }
  }
}
