import { useState } from 'react'
import { Outlet } from 'react-router'
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

// TODO(backend): replace with the signed-in user + company from Supabase session.
const SESSION_PLACEHOLDER = {
  companyName: 'Nordwind Trading Sp. z o.o.',
  user: { name: 'Anna Kowalska', email: 'anna@nordwind.pl' },
}

export function AppShell() {
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
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header companyName={SESSION_PLACEHOLDER.companyName} user={SESSION_PLACEHOLDER.user} />
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
