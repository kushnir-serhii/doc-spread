import { useId, useRef, useState, type FormEvent } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CURRENCIES } from '@/lib/mock/types'
import type { Company, CurrencyCode } from '@/lib/mock/types'
import { cn } from '@/lib/utils'

export type CompanyFormValues = Pick<Company, 'name' | 'taxId' | 'defaultCurrency'>

interface CompanyFormProps {
  initialValues: CompanyFormValues
  onSubmit: (values: CompanyFormValues) => void
  pending: boolean
  /** Message of a failed save; the form stays as it is. */
  error: string | null
  submitLabel: string
}

const isCurrency = (value: string): value is CurrencyCode => CURRENCIES.some((currency) => currency === value)

export const CompanyForm = ({ initialValues, onSubmit, pending, error, submitLabel }: CompanyFormProps) => {
  const id = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initialValues.name)
  const [taxId, setTaxId] = useState(initialValues.taxId)
  const [currency, setCurrency] = useState<CurrencyCode>(initialValues.defaultCurrency)
  const [submitted, setSubmitted] = useState(false)

  const nameError = submitted && name.trim() === '' ? 'Enter your company name.' : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    const trimmed = name.trim()
    if (trimmed === '') {
      nameRef.current?.focus()
      return
    }
    onSubmit({ name: trimmed, taxId: taxId.trim(), defaultCurrency: currency })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Company name</Label>
        <Input
          id={`${id}-name`}
          ref={nameRef}
          autoComplete="organization"
          value={name}
          aria-invalid={nameError !== null}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        {nameError && (
          <p id={`${id}-name-error`} className="text-xs text-destructive">
            {nameError}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-tax-id`}>
          Tax ID <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id={`${id}-tax-id`}
          value={taxId}
          disabled={pending}
          onChange={(event) => setTaxId(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-currency`}>Default currency</Label>
        {/* The native arrow hugs the edge; it's hidden and replaced by a chevron with the input's padding. */}
        <div className="relative">
          <select
            id={`${id}-currency`}
            value={currency}
            disabled={pending}
            aria-describedby={`${id}-currency-help`}
            onChange={(event) => {
              if (isCurrency(event.target.value)) setCurrency(event.target.value)
            }}
            className={cn(
              'min-h-touch w-full appearance-none rounded-md border border-input bg-card pr-9 pl-3 text-sm shadow-xs outline-none md:min-h-9',
              'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
        <p id={`${id}-currency-help`} className="text-xs text-muted-foreground">
          Used when a document doesn’t show a currency.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t save: {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="min-h-touch md:min-h-9">
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
