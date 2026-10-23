import { ChevronDown, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NEW_TYPE_OPTIONS } from './new-type-options'

export const NewTypeMenu = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="min-h-touch md:min-h-9">
        <Plus aria-hidden />
        New type
        <ChevronDown aria-hidden />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      {NEW_TYPE_OPTIONS.map(({ id, label, hint, to, icon: Icon }) => (
        <DropdownMenuItem key={id} asChild className="min-h-touch md:min-h-8">
          <Link to={to}>
            <Icon aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span>{label}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </span>
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)
