import type { Ref } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TableAddRowButtonProps {
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

export const TableAddRowButton = ({ onClick, ref }: TableAddRowButtonProps) => (
  <Button ref={ref} type="button" variant="outline" className="min-h-touch self-start" onClick={onClick}>
    <Plus aria-hidden="true" />
    Add row
  </Button>
)
