import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useDocumentTypes } from '@/lib/api'
import { cn } from '@/lib/utils'

interface TypeSelectProps {
  /** a document type id; empty string means "Detect automatically" */
  value: string
  onChange: (typeId: string) => void
}

export const TypeSelect = ({ value, onChange }: TypeSelectProps) => {
  const selectId = useId()
  const types = useDocumentTypes()

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={selectId}>Type</Label>
      <select
        id={selectId}
        value={value}
        disabled={types.isPending}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-11 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none sm:max-w-xs',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <option value="">Detect automatically</option>
        {types.data?.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>
      {types.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger-soft-foreground">
          <span>Could not load your types. Files are still detected automatically.</span>
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void types.refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick one if every file in this batch is the same type.</p>
      )}
    </div>
  )
}
