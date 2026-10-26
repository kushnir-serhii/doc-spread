import { Table, X } from 'lucide-react'
import type { Ref } from 'react'
import { Button } from '@/components/ui/button'

interface AddTableButtonProps {
  pointing: boolean
  onToggle: () => void
  ref?: Ref<HTMLButtonElement>
}

/** Starts drawing a rectangle over a table on the viewer; while drawing it cancels. */
export const AddTableButton = ({ pointing, onToggle, ref }: AddTableButtonProps) => (
  <Button
    ref={ref}
    variant={pointing ? 'secondary' : 'outline'}
    size="sm"
    aria-pressed={pointing}
    onClick={onToggle}
    className="min-h-touch md:min-h-9"
  >
    {pointing ? <X aria-hidden /> : <Table aria-hidden />}
    {pointing ? 'Cancel' : 'Add a table'}
  </Button>
)
