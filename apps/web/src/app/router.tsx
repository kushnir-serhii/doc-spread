import { createBrowserRouter, Navigate, Outlet } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { AuthLayout } from '@/components/layout/auth-layout'
import { RoutePending } from '@/components/layout/route-pending'

// PlaceholderPage takes props per route, so its lazy route returns an element instead of a Component.
const placeholder = (title: string, description: string) => () =>
  import('@/pages/placeholder/placeholder-page').then(({ default: PlaceholderPage }) => ({
    element: <PlaceholderPage title={title} description={description} />,
  }))

export const router = createBrowserRouter([
  {
    // Pathless root: shows the pending bar for every navigation and the hydrate fallback on first load
    element: (
      <>
        <RoutePending />
        <Outlet />
      </>
    ),
    hydrateFallbackElement: <RoutePending forceVisible />,
    children: [
      // Public — outside the app shell
      { path: '/', lazy: () => import('@/pages/landing/landing-page').then((m) => ({ Component: m.default })) },
      {
        element: <AuthLayout />,
        children: [
          { path: '/sign-in', lazy: () => import('@/pages/auth/sign-in-page').then((m) => ({ Component: m.default })) },
          { path: '/sign-up', lazy: () => import('@/pages/auth/sign-up-page').then((m) => ({ Component: m.default })) },
          {
            path: '/reset-password',
            lazy: () => import('@/pages/auth/reset-password-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/onboarding',
            lazy: () => import('@/pages/onboarding/onboarding-page').then((m) => ({ Component: m.default })),
          },
        ],
      },

      // App — inside the shell
      {
        element: <AppShell />,
        children: [
          { path: '/app', element: <Navigate to="/inbox" replace /> },
          { path: '/upload', lazy: () => import('@/pages/upload/upload-page').then((m) => ({ Component: m.default })) },
          { path: '/inbox', lazy: () => import('@/pages/inbox/inbox-page').then((m) => ({ Component: m.default })) },
          {
            path: '/types',
            lazy: () => import('@/pages/types/types-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/types/new',
            lazy: () => import('@/pages/types/new-type-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/types/:typeId',
            lazy: () => import('@/pages/types/type-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/types/:typeId/train',
            lazy: () => import('@/pages/types/train-type-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/documents/:documentId',
            lazy: () => import('@/pages/review/review-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/groups',
            lazy: () => import('@/pages/groups/groups-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/groups/:typeId/:fieldId',
            lazy: placeholder('Group', 'Every value of this field and its documents.'),
          },
          { path: '/export', lazy: () => import('@/pages/export/export-page').then((m) => ({ Component: m.default })) },
          { path: '/settings', lazy: placeholder('Settings', 'Company, accountant, team and plan.') },
          { path: '/design', lazy: () => import('@/pages/design/design-page').then((m) => ({ Component: m.default })) },
          {
            path: '*',
            lazy: () => import('@/pages/not-found/not-found-page').then((m) => ({ Component: m.default })),
          },
        ],
      },
    ],
  },
])
