import { Link } from 'react-router'
import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'

export const LandingFooter = () => {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} DocSpread</p>
        </div>
        <nav aria-label="Account" className="-mx-4 flex flex-col sm:mx-0 sm:flex-row sm:items-center sm:gap-2">
          <Button asChild variant="ghost" className="min-h-touch justify-start sm:justify-center">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="ghost" className="min-h-touch justify-start sm:justify-center">
            <Link to="/sign-up">Create account</Link>
          </Button>
        </nav>
      </div>
    </footer>
  )
}
