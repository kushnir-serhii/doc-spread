import { Link, Outlet, useMatches } from 'react-router'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'

/** A route can set `handle: { ownsCard: true }` to render its own card (e.g. onboarding, whose width changes per step). */
const ownsCard = (handle: unknown): boolean =>
  typeof handle === 'object' && handle !== null && 'ownsCard' in handle && handle.ownsCard === true

/** Centered card layout for auth + onboarding (outside the app shell). */
export const AuthLayout = () => {
  const matches = useMatches()
  const routeOwnsCard = matches.some((match) => ownsCard(match.handle))

  return (
    <div className="flex min-h-dvh flex-col bg-muted/50">
      <header className="flex h-header items-center justify-between px-4 md:px-8">
        <Link to="/" className="rounded-md" aria-label="DocSpread home">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center">
        {routeOwnsCard ? (
          <Outlet />
        ) : (
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm md:p-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
