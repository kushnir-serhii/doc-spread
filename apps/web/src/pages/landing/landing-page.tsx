import { Link } from 'react-router'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { Hero } from '@/features/landing/hero'
import { HowItWorks } from '@/features/landing/how-it-works'
import { LandingFooter } from '@/features/landing/landing-footer'

const LandingPage = () => {
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
      <main className="flex-1">
        <Hero />
        <HowItWorks />
      </main>
      <LandingFooter />
    </div>
  )
}

export default LandingPage
