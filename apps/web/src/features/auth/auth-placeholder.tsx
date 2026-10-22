import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export interface AuthPlaceholderProps {
  title: string
  links: { to: string; label: string }[]
}

export const AuthPlaceholder = ({ title, links }: AuthPlaceholderProps) => {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">Form coming in the Auth step.</p>
      <Button asChild className="min-h-touch md:min-h-9">
        <Link to="/inbox">Continue to app</Link>
      </Button>
      <div className="flex flex-col gap-1 text-sm">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="w-fit text-primary underline-offset-4 hover:underline">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
