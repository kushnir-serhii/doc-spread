import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

const NotFoundPage = () => {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="amount text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist or was moved.</p>
      <Button asChild className="mt-2 min-h-touch md:min-h-9">
        <Link to="/inbox">Go to Inbox</Link>
      </Button>
    </div>
  )
}

export default NotFoundPage
