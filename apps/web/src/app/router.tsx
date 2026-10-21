import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { AuthLayout, OnboardingPage, ResetPasswordPage, SignInPage, SignUpPage } from '@/pages/auth-pages'
import { DesignPage } from '@/pages/design-page'
import { LandingPage } from '@/pages/landing-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { PlaceholderPage } from '@/pages/placeholder-page'

export const router = createBrowserRouter([
  // Public — outside the app shell
  { path: '/', element: <LandingPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
    ],
  },

  // App — inside the shell
  {
    element: <AppShell />,
    children: [
      { path: '/app', element: <Navigate to="/inbox" replace /> },
      {
        path: '/inbox',
        element: <PlaceholderPage title="Inbox" description="All invoices, their status and AI confidence." />,
      },
      {
        path: '/upload',
        element: <PlaceholderPage title="Upload" description="Drop PDF, JPG or PNG invoices to process them." />,
      },
      {
        path: '/invoices/:invoiceId',
        element: <PlaceholderPage title="Review invoice" description="Check extracted fields and approve." />,
      },
      {
        path: '/export',
        element: <PlaceholderPage title="Export" description="Send approved invoices to your accountant." />,
      },
      {
        path: '/suppliers',
        element: <PlaceholderPage title="Suppliers" description="Everyone who sends you invoices." />,
      },
      {
        path: '/suppliers/:supplierId',
        element: <PlaceholderPage title="Supplier" description="Supplier details and their invoices." />,
      },
      {
        path: '/settings',
        element: <PlaceholderPage title="Settings" description="Company, accountant, team and plan." />,
      },
      { path: '/design', element: <DesignPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
