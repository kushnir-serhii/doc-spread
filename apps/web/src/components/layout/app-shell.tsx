import { useState } from 'react'
import { Outlet } from 'react-router'
import { useSession } from '@/lib/api/auth'
import { useCompany } from '@/lib/api/company'
import { FormatLocaleProvider } from '@/lib/format-locale/format-locale-provider'
import { Header } from './header'
import { Sidebar } from './sidebar'

const COLLAPSED_KEY = 'docspread-sidebar-collapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const company = useCompany()
  const session = useSession()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <FormatLocaleProvider locale={company.data?.locale ?? undefined}>
      <div className="flex min-h-dvh bg-background">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header companyName={company.isPending ? null : (company.data?.name ?? '')} user={session.status === 'signed-in' ? session.user : { name: '', email: '' }} />
          <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </FormatLocaleProvider>
  )
}
