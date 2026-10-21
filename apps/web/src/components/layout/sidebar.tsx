import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { DEV_NAV, MAIN_NAV } from './nav-items'
import { SidebarNav } from './sidebar-nav'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/** Desktop sidebar (md and up). Below md the same nav lives in <MobileNav />. */
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      <div className={cn('flex h-header shrink-0 items-center px-4', collapsed && 'justify-center px-0')}>
        <Link to="/inbox" className="rounded-md" aria-label="DocSpread, go to Inbox">
          <Logo collapsed={collapsed} />
        </Link>
      </div>
      <div className={cn('flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2', collapsed && 'px-2')}>
        <SidebarNav items={MAIN_NAV} label="Main" collapsed={collapsed} />
        <div className="mt-auto flex flex-col gap-2">
          <Separator />
          <SidebarNav items={DEV_NAV} label="Developer" collapsed={collapsed} />
        </div>
      </div>
      <div className={cn('border-t border-sidebar-border p-3', collapsed && 'flex justify-center px-2')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon-lg' : 'lg'}
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-label={toggleLabel}
              className={cn('text-muted-foreground', !collapsed && 'w-full justify-start px-3')}
            >
              <ToggleIcon aria-hidden="true" />
              {!collapsed && <span>Collapse</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{toggleLabel}</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  )
}
