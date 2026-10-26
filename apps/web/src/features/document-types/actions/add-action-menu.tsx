import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FieldAction } from '@/lib/mock/types'

interface AddActionMenuProps {
  disabled?: boolean
  onAdd: (kind: FieldAction['kind']) => void
}

export const AddActionMenu = ({ disabled = false, onAdd }: AddActionMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" disabled={disabled} data-add-action className="min-h-touch self-start md:min-h-9">
        <Plus aria-hidden />
        Add action
        <ChevronDown aria-hidden />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
      <DropdownMenuItem onSelect={() => onAdd('check')} className="min-h-touch flex-col items-start gap-0.5 md:min-h-9">
        <span className="font-medium">Check</span>
        <span className="text-xs text-muted-foreground">Compare two values, e.g. Gross = Net + VAT.</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onAdd('compute')} className="min-h-touch flex-col items-start gap-0.5 md:min-h-9">
        <span className="font-medium">Computed field</span>
        <span className="text-xs text-muted-foreground">Calculate a field instead of extracting it.</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)
