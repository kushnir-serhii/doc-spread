import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

interface GroupBackLinkProps {
  to?: string
  label?: string
}

export const GroupBackLink = ({ to = '/groups', label = 'Groups' }: GroupBackLinkProps) => (
  <Link
    to={to}
    className="-ml-1 mb-2 inline-flex min-h-touch max-w-full items-center gap-1.5 rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-9"
  >
    <ArrowLeft className="size-4 shrink-0" aria-hidden />
    <span className="min-w-0 wrap-break-word">{label}</span>
  </Link>
)
