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
          { path: '/inbox', lazy: placeholder('Inbox', 'All documents, their status and AI confidence.') },
          { path: '/upload', lazy: placeholder('Upload', 'Drop PDF, JPG or PNG files to process them.') },
          {
            path: '/types',
            lazy: () => import('@/pages/types/types-page').then((m) => ({ Component: m.default })),
          },
          {
            path: '/types/new',
            lazy: placeholder('New document type', 'Start from a template, from scratch, or from a sample.'),
          },
          {
            path: '/types/:typeId',
            lazy: placeholder('Document type', 'Fields, list columns and how AI reads them.'),
          },
          {
            path: '/documents/:documentId',
            lazy: placeholder('Review document', 'Check extracted fields and approve.'),
          },
          {
            path: '/groups',
            lazy: placeholder('Groups', 'Documents grouped by a field, like company or counterparty.'),
          },
          {
            path: '/groups/:typeId/:fieldId',
            lazy: placeholder('Group', 'Every value of this field and its documents.'),
          },
          { path: '/export', lazy: placeholder('Export', 'Send approved documents as a spreadsheet.') },
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
