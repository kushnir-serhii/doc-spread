import { Link, Outlet } from 'react-router'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'

/** Centered card layout for auth + onboarding (outside the app shell). */
export const AuthLayout = () => {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/50">
      <header className="flex h-header items-center justify-between px-4 md:px-8">
        <Link to="/" className="rounded-md" aria-label="DocSpread home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
