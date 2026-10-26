import { useId } from 'react'
import type { ExportFormat } from '@/lib/mock/types'
import { FORMAT_OPTIONS } from './export-options'
import { RadioOption } from './radio-option'

interface FormatFieldsetProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
}

export const FormatFieldset = ({ value, onChange }: FormatFieldsetProps) => {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Format</legend>
      {FORMAT_OPTIONS.map((option) => (
        <RadioOption
          key={option.value}
          name={name}
          label={option.label}
          description={option.description}
          checked={value === option.value}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </fieldset>
  )
}
