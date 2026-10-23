import { useId } from 'react'

interface GroupByToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export const GroupByToggle = ({ checked, onChange }: GroupByToggleProps) => {
  const id = useId()
  const helpId = `${id}-help`
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-touch items-center gap-3 text-sm font-medium md:min-h-9">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={helpId}
          onChange={(event) => onChange(event.target.checked)}
          className="size-5 accent-primary"
        />
        Group documents by this field
      </label>
      <p id={helpId} className="text-xs text-muted-foreground">
        Groups appear on the Groups page: documents with the same value, with counts and totals.
      </p>
    </div>
  )
}
