import { Link, Outlet } from 'react-router'
import { Logo } from '@/components/layout/logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

/** Centered card layout for auth + onboarding (outside the app shell). */
export function AuthLayout() {
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

function AuthPlaceholder({ title, links }: { title: string; links: { to: string; label: string }[] }) {
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

export function SignInPage() {
  return (
    <AuthPlaceholder
      title="Sign in"
      links={[
        { to: '/sign-up', label: 'Create an account' },
        { to: '/reset-password', label: 'Forgot password?' },
      ]}
    />
  )
}

export function SignUpPage() {
  return <AuthPlaceholder title="Create your account" links={[{ to: '/sign-in', label: 'I already have an account' }]} />
}

export function ResetPasswordPage() {
  return <AuthPlaceholder title="Reset password" links={[{ to: '/sign-in', label: 'Back to sign in' }]} />
}

export function OnboardingPage() {
  return <AuthPlaceholder title="Set up your company" links={[]} />
}
