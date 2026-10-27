import type { TeamRole } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

const ROLE_META: Record<TeamRole, { label: string; className: string }> = {
  owner: { label: 'Owner', className: 'bg-primary-soft text-primary-soft-foreground' },
  admin: { label: 'Admin', className: 'bg-secondary text-secondary-foreground' },
  member: { label: 'Member', className: 'bg-muted text-muted-foreground' },
}

export interface RoleBadgeProps {
  role: TeamRole
  className?: string
}

export const RoleBadge = ({ role, className }: RoleBadgeProps) => (
  <span
    className={cn(
      'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
      ROLE_META[role].className,
      className,
    )}
  >
    {ROLE_META[role].label}
  </span>
)
