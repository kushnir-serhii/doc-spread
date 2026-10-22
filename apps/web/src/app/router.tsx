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
          { path: '/inbox', lazy: placeholder('Inbox', 'All invoices, their status and AI confidence.') },
          { path: '/upload', lazy: placeholder('Upload', 'Drop PDF, JPG or PNG invoices to process them.') },
          {
            path: '/invoices/:invoiceId',
            lazy: placeholder('Review invoice', 'Check extracted fields and approve.'),
          },
          { path: '/export', lazy: placeholder('Export', 'Send approved invoices to your accountant.') },
          { path: '/suppliers', lazy: placeholder('Suppliers', 'Everyone who sends you invoices.') },
          {
            path: '/suppliers/:supplierId',
            lazy: placeholder('Supplier', 'Supplier details and their invoices.'),
          },
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
