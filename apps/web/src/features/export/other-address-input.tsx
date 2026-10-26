import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addressError } from './export-options'

interface OtherAddressInputProps {
  value: string
  onChange: (address: string) => void
  /** show the error now, e.g. after a blocked submit */
  showError?: boolean
}

/** Email input; the error appears after the field was left once. */
export const OtherAddressInput = ({ value, onChange, showError = false }: OtherAddressInputProps) => {
  const id = useId()
  const [touched, setTouched] = useState(false)
  const error = touched || showError ? addressError(value) : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Email address</Label>
      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        placeholder="name@example.com"
        aria-invalid={error !== undefined}
        aria-describedby={`${id}-error`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
        className="min-h-touch md:min-h-9"
      />
      <p id={`${id}-error`} role="alert" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  )
}
