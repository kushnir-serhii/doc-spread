import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { requestPasswordReset, signIn as mockSignIn, signUp as mockSignUp } from '@/lib/mock'
import { getSession, onSessionChange, signIn as realSignIn, signOut as realSignOut, signUp as realSignUp } from '@/lib/real/auth'

export type SessionUser = { name: string; email: string }

/** What the app knows about the visitor. With mocks on the visitor is always the mock user. */
export type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: SessionUser }

const MOCK_USER: SessionUser = { name: 'Alex Morgan', email: 'alex@northwind-studio.example' }
const MOCK_SESSION: SessionState = { status: 'signed-in', user: MOCK_USER }

export const sessionKeys = {
  all: ['session'] as const,
  current: () => [...sessionKeys.all, 'current'] as const,
}

const readSession = async (): Promise<SessionState> => {
  const session = await getSession()
  const email = session?.user.email
  return session && email ? { status: 'signed-in', user: { name: email, email } } : { status: 'signed-out' }
}

export const useSession = (): SessionState => {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: sessionKeys.current(),
    queryFn: USE_MOCKS ? () => Promise.resolve(MOCK_SESSION) : readSession,
    initialData: USE_MOCKS ? MOCK_SESSION : undefined,
    staleTime: Infinity,
  })
  // Keep the cache in step with supabase-js (sign-in, sign-out, refresh, another tab): a subscription outside React.
  useEffect(() => {
    if (USE_MOCKS) return undefined
    return onSessionChange((session) => {
      const email = session?.user.email
      queryClient.setQueryData<SessionState>(
        sessionKeys.current(),
        session && email ? { status: 'signed-in', user: { name: email, email } } : { status: 'signed-out' },
      )
    })
  }, [queryClient])
  if (query.data) return query.data
  return query.isError ? { status: 'signed-out' } : { status: 'loading' }
}

/** After a sign-in the session cache is refreshed before the caller navigates, so the route guard sees it. */
const useRefreshSession = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sessionKeys.all })
}

export const useSignIn = () => {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => (USE_MOCKS ? mockSignIn(input) : realSignIn(input)),
    onSuccess: refreshSession,
  })
}

/** `name` is what the form asks for: the full name with mocks on, the company name with mocks off. */
export const useSignUp = () => {
  const refreshSession = useRefreshSession()
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      USE_MOCKS
        ? mockSignUp(input)
        : realSignUp({ companyName: input.name, email: input.email, password: input.password }),
    onSuccess: refreshSession,
  })
}

export const useSignOut = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!USE_MOCKS) await realSignOut()
    },
    onSuccess: () => {
      // Nothing of the previous user may stay in the cache.
      if (!USE_MOCKS) queryClient.clear()
    },
  })
}

export const useRequestPasswordReset = () =>
  useMutation({
    mutationFn: (input: { email: string }) => requestPasswordReset(input),
  })
