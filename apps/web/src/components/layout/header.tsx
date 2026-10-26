import { Building2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export interface HeaderProps {
  /** null while the company is loading; empty when it isn't known (then nothing is shown) */
  companyName: string | null
  user: { name: string; email: string }
}

export function Header({ companyName, user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:gap-4 md:px-6">
      <MobileNav />

      {/* Search — placeholder until global search is built */}
      <form role="search" className="relative min-w-0 flex-1 md:max-w-md" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="global-search" className="sr-only">
          Search documents
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="global-search"
          type="search"
          placeholder="Search documents…"
          className="h-10 bg-card pl-9 md:h-9"
          autoComplete="off"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        {companyName === null && <Skeleton className="hidden h-5 w-40 lg:block" aria-hidden="true" />}
        {companyName && (
          <div
            className="hidden max-w-56 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground lg:flex"
            title={companyName}
          >
            <Building2 className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{companyName}</span>
          </div>
        )}
        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  )
}
