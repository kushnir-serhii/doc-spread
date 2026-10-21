import { NavLink } from 'react-router'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { NavItem } from './nav-items'

interface SidebarNavProps {
  items: NavItem[]
  label: string
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ items, label, collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map(({ to, label: itemLabel, icon: Icon }) => {
          const link = (
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors md:min-h-10',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground [&>svg]:text-primary',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className={cn(collapsed && 'sr-only')}>{itemLabel}</span>
            </NavLink>
          )
          return (
            <li key={to}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{itemLabel}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
