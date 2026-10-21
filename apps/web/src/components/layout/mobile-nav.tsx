import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from './logo'
import { DEV_NAV, MAIN_NAV } from './nav-items'
import { SidebarNav } from './sidebar-nav'

/** Drawer navigation for screens below md. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-touch md:hidden" aria-label="Open navigation">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
        <SheetHeader className="h-header shrink-0 justify-center border-b border-sidebar-border px-4 py-0">
          <SheetTitle>
            <Logo />
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
          <SidebarNav items={MAIN_NAV} label="Main" onNavigate={close} />
          <div className="mt-auto flex flex-col gap-2">
            <Separator />
            <SidebarNav items={DEV_NAV} label="Developer" onNavigate={close} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
