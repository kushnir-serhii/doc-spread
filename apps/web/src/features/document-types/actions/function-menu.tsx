import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FUNCTION_GROUPS, FUNCTION_GROUP_LABELS, FUNCTIONS, type FunctionDef } from '@/lib/fields/functions'
import type { FunctionId } from '@/lib/mock/types'

interface FunctionMenuProps {
  label: string
  /** the functions on offer, in UI order */
  functions: readonly FunctionDef[]
  /** set when a function is already chosen */
  current: FunctionId | null
  onSelect: (fn: FunctionId) => void
}

/** Functions grouped as in the registry, each with its description. */
export const FunctionMenu = ({ label, functions, current, onSelect }: FunctionMenuProps) => {
  const chosen = current ? FUNCTIONS[current] : undefined
  const groups = FUNCTION_GROUPS.filter((group) => functions.some((fn) => fn.group === group))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={current ? 'secondary' : 'outline'}
          aria-pressed={current !== null}
          aria-label={chosen ? `${label}: function ${chosen.label}, change` : `${label}: choose a function`}
          className={cn('min-h-touch md:min-h-9', current && 'border border-primary')}
        >
          {chosen ? chosen.label : 'Function'}
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 w-80 max-w-[calc(100vw-2rem)]">
        {groups.map((group, index) => (
          <DropdownMenuGroup key={group}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{FUNCTION_GROUP_LABELS[group]}</DropdownMenuLabel>
            {functions
              .filter((fn) => fn.group === group)
              .map((fn) => (
                <DropdownMenuItem
                  key={fn.id}
                  onSelect={() => onSelect(fn.id)}
                  className="min-h-touch flex-col items-start gap-0.5 md:min-h-9"
                >
                  <span className="font-medium">{fn.label}</span>
                  <span className="text-xs text-muted-foreground">{fn.description}</span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
