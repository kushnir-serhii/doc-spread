import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { TeamMember } from '@/lib/mock/types'
import { MemberPendingBadge } from './member-pending-badge'
import { RoleBadge } from './role-badge'

export interface TeamMembersTableProps {
  members: TeamMember[]
}

/** Desktop list (from `sm`); below it the cards are shown instead. */
export const TeamMembersTable = ({ members }: TeamMembersTableProps) => (
  <div className="hidden rounded-md border bg-card sm:block">
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/4">Name</TableHead>
          <TableHead className="w-2/5">Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="truncate font-medium" title={member.name ?? member.email}>
              {member.name ?? member.email}
            </TableCell>
            <TableCell className="truncate text-muted-foreground" title={member.email}>
              {member.name === null ? '' : member.email}
            </TableCell>
            <TableCell>
              <RoleBadge role={member.role} />
            </TableCell>
            <TableCell>
              <MemberPendingBadge status={member.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)
