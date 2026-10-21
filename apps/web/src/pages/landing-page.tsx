import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

/** Placeholder — full landing page comes in the Landing step. */
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-header items-center justify-between px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="min-h-touch md:min-h-9">
            <Link to="/sign-in">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Supplier invoices, read by AI and approved by you.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Upload invoices, check what AI extracted, and send them to your accountant.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="min-h-touch">
            <Link to="/sign-up">
              Get started
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="min-h-touch">
            <Link to="/inbox">Open the app</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
