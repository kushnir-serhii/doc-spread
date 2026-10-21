import { LogOut, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface UserMenuProps {
  name: string
  email: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function UserMenu({ name, email }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-touch rounded-full md:size-9" aria-label={`Account menu for ${name}`}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary-soft-foreground">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-touch md:min-h-8">
          <Link to="/settings">
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-touch md:min-h-8">
          <Link to="/sign-in">
            <LogOut aria-hidden="true" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
