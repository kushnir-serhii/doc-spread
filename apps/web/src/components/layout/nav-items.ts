import { FileOutput, Inbox, Layers, Palette, Settings, Shapes, Upload, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const MAIN_NAV: NavItem[] = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/types', label: 'Types', icon: Shapes },
  { to: '/groups', label: 'Groups', icon: Layers },
  { to: '/export', label: 'Export', icon: FileOutput },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const DEV_NAV: NavItem[] = [{ to: '/design', label: 'Design tokens', icon: Palette }]
