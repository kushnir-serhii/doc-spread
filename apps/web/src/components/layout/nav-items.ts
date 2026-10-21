import { FileOutput, Inbox, Palette, Settings, Truck, Upload, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const MAIN_NAV: NavItem[] = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/export', label: 'Export', icon: FileOutput },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const DEV_NAV: NavItem[] = [{ to: '/design', label: 'Design tokens', icon: Palette }]
