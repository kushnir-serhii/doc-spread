import { useId } from 'react'
import { useCompany } from '@/lib/api'
import type { DestinationOption } from './export-options'
import { RadioOption } from './radio-option'
import { RecipientPicker } from './recipient-picker'

interface DestinationFieldsetProps {
  value: DestinationOption
  onChange: (destination: DestinationOption) => void
  /** show address errors now, e.g. after a blocked submit */
  showErrors?: boolean
}

export const DestinationFieldset = ({ value, onChange, showErrors }: DestinationFieldsetProps) => {
  const name = useId()
  const firstRecipient = useCompany().data?.recipients[0]
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Destination</legend>
      <RadioOption
        name={name}
        label="Download"
        description="Get the file in your browser."
        checked={value.kind === 'download'}
        onSelect={() => onChange({ kind: 'download' })}
      />
      <RadioOption
        name={name}
        label="Email"
        description="Send the file to a saved recipient or another address."
        checked={value.kind === 'email'}
        onSelect={() =>
          onChange({
            kind: 'email',
            recipient: firstRecipient ? { kind: 'saved', id: firstRecipient.id } : { kind: 'other', address: '' },
          })
        }
      >
        {value.kind === 'email' && (
          <RecipientPicker
            value={value.recipient}
            onChange={(recipient) => onChange({ kind: 'email', recipient })}
            showErrors={showErrors}
          />
        )}
      </RadioOption>
    </fieldset>
  )
}
