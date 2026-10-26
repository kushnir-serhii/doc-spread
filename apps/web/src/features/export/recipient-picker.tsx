import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompany } from '@/lib/api'
import type { RecipientChoice } from './export-options'
import { OtherAddressInput } from './other-address-input'
import { RadioOption } from './radio-option'

interface RecipientPickerProps {
  value: RecipientChoice
  onChange: (choice: RecipientChoice) => void
  showErrors?: boolean
}

/** Saved recipients from Settings plus "Other address". */
export const RecipientPicker = ({ value, onChange, showErrors }: RecipientPickerProps) => {
  const name = useId()
  const company = useCompany()
  const recipients = company.data?.recipients ?? []

  if (company.isPending) return <Skeleton role="status" aria-label="Loading recipients" className="h-11 w-full" />

  return (
    <div className="flex flex-col gap-2">
      {company.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger-soft-foreground">
          Saved recipients could not be loaded.
          <Button variant="outline" size="sm" className="min-h-touch md:min-h-8" onClick={() => void company.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {recipients.map((recipient) => (
        <RadioOption
          key={recipient.id}
          name={name}
          label={recipient.name}
          description={recipient.email}
          checked={value.kind === 'saved' && value.id === recipient.id}
          onSelect={() => onChange({ kind: 'saved', id: recipient.id })}
        />
      ))}
      <RadioOption
        name={name}
        label="Other address"
        checked={value.kind === 'other'}
        onSelect={() => onChange({ kind: 'other', address: '' })}
      >
        {value.kind === 'other' && (
          <OtherAddressInput
            value={value.address}
            onChange={(address) => onChange({ kind: 'other', address })}
            showError={showErrors}
          />
        )}
      </RadioOption>
    </div>
  )
}
