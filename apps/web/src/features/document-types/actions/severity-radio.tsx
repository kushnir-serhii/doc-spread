import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { Severity } from './action-form'

const OPTIONS: { value: Severity; label: string; help: string }[] = [
  { value: 'warning', label: 'Warning', help: 'Shown in Review. The user can approve after confirming.' },
  { value: 'blocking', label: 'Blocking', help: 'Shown in Review. Approve is stopped until the check passes.' },
]

interface SeverityRadioProps {
  value: Severity
  onChange: (value: Severity) => void
}

export const SeverityRadio = ({ value, onChange }: SeverityRadioProps) => {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">When the check fails</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex min-h-touch cursor-pointer items-start gap-3 rounded-md border p-3 has-focus-visible:ring-2 has-focus-visible:ring-ring md:min-h-9',
              value === option.value && 'border-primary bg-accent',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">{option.help}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
