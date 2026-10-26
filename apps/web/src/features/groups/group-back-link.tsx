import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

export const GroupBackLink = () => (
  <Link
    to="/groups"
    className="-ml-1 mb-2 inline-flex min-h-touch items-center gap-1.5 rounded-sm px-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-9"
  >
    <ArrowLeft className="size-4" aria-hidden />
    Groups
  </Link>
)
