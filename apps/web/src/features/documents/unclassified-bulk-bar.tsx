import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { DocumentType } from '@/lib/mock/types'

interface UnclassifiedBulkBarProps {
  count: number
  types: DocumentType[]
  isAssigning: boolean
  onAssign: (typeId: string) => void
  onClear: () => void
}

/** Same look as BulkBar: sticky at the bottom on small screens, a plain bar above the table from md up. */
export const UnclassifiedBulkBar = ({ count, types, isAssigning, onAssign, onClear }: UnclassifiedBulkBarProps) => {
  const selectId = useId()
  const [typeId, setTypeId] = useState('')

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="sticky bottom-0 z-20 -mx-4 border-t bg-background px-4 py-3 max-md:order-last md:static md:mx-0 md:mb-3 md:rounded-lg md:border"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="mr-auto text-sm font-medium">{count} selected</p>
        <div className="flex items-center gap-2">
          <Label htmlFor={selectId}>Type</Label>
          <select
            id={selectId}
            value={typeId}
            disabled={isAssigning}
            onChange={(event) => setTypeId(event.target.value)}
            className="min-h-touch w-44 rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 md:text-sm"
          >
            <option value="">Choose…</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <Button className="min-h-touch" disabled={!typeId || isAssigning} onClick={() => onAssign(typeId)}>
          {isAssigning ? 'Assigning…' : `Assign ${count}`}
        </Button>
        <Button variant="ghost" className="min-h-touch" disabled={isAssigning} onClick={onClear}>
          Clear selection
        </Button>
      </div>
    </div>
  )
}
