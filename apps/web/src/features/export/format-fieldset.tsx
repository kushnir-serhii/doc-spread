import { useId } from 'react'
import { USE_MOCKS } from '@/lib/env'
import type { ExportFormat } from '@/lib/mock/types'
import { FORMAT_OPTIONS } from './export-options'
import { RadioOption } from './radio-option'

const NOT_AVAILABLE = 'Not available yet.'

interface FormatFieldsetProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
}

export const FormatFieldset = ({ value, onChange }: FormatFieldsetProps) => {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Format</legend>
      {FORMAT_OPTIONS.map((option) => {
        const unavailable = !USE_MOCKS && option.value === 'pdf_bundle'
        return (
          <RadioOption
            key={option.value}
            name={name}
            label={option.label}
            description={unavailable ? NOT_AVAILABLE : option.description}
            disabled={unavailable}
            checked={value === option.value}
            onSelect={() => onChange(option.value)}
          />
        )
      })}
    </fieldset>
  )
}
