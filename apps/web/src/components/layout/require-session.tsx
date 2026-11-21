import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { RoutePending } from '@/components/layout/route-pending'
import { useSession } from '@/lib/api'

/** App routes need a session: without one the visitor goes to sign-in and comes back to the page they asked for. */
export const RequireSession = ({ children }: { children: ReactNode }) => {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <RoutePending forceVisible />
  if (session.status === 'signed-out') {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/sign-in?returnTo=${returnTo}`} replace />
  }
  return <>{children}</>
}
