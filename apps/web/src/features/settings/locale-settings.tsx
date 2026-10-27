import { useId, useState, type FormEvent } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useUpdateCompany } from '@/lib/api'
import type { Company } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { browserLocaleLabel, LOCALE_TAGS, localeLabel } from './locale-options'
import { LocalePreview } from './locale-preview'

interface LocaleSettingsProps {
  company: Company
}

/** Language and formats: its own form and Save, apart from the company details. */
export const LocaleSettings = ({ company }: LocaleSettingsProps) => {
  const id = useId()
  const update = useUpdateCompany()
  const [value, setValue] = useState(company.locale ?? '')
  const [saved, setSaved] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaved(false)
    update.mutate({ locale: value || null }, { onSuccess: () => setSaved(true) })
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border bg-card p-4 md:p-6">
      <h2 id={`${id}-title`} className="text-base font-semibold">
        Language and formats
      </h2>
      <form noValidate onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-locale`}>Locale</Label>
          {/* The native arrow hugs the edge; it's hidden and replaced by a chevron with the input's padding. */}
          <div className="relative">
            <select
              id={`${id}-locale`}
              value={value}
              disabled={update.isPending}
              aria-describedby={`${id}-help`}
              onChange={(event) => {
                setSaved(false)
                setValue(event.target.value)
              }}
              className={cn(
                'min-h-touch w-full appearance-none rounded-md border border-input bg-card pr-9 pl-3 text-sm shadow-xs outline-none md:min-h-9',
                'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <option value="">Browser default ({browserLocaleLabel()})</option>
              {LOCALE_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {localeLabel(tag)}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            Dates, numbers and amounts across the app use this. The values in your documents aren’t changed.
          </p>
        </div>
        <LocalePreview locale={value || undefined} currency={company.defaultCurrency} />
        {update.isError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn’t save: {update.error.message}
          </p>
        )}
        <Button type="submit" disabled={update.isPending} className="min-h-touch w-full sm:w-auto md:min-h-9">
          {update.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {saved && !update.isPending && !update.isError ? 'Language and formats saved.' : ''}
        </p>
      </form>
    </section>
  )
}
