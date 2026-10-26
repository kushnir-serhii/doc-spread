import type { ComponentProps } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TableRemoveRowButtonProps = Omit<ComponentProps<typeof Button>, 'aria-label' | 'children'> & {
  /** 1-based row number, for the accessible name */
  number: number
}

/** Removes at once, without a dialog: the draft and the leave guard cover mistakes. */
export const TableRemoveRowButton = ({ number, ...props }: TableRemoveRowButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="min-h-touch min-w-touch"
    aria-label={`Remove row ${number}`}
    {...props}
  >
    <Trash2 aria-hidden="true" />
  </Button>
)
