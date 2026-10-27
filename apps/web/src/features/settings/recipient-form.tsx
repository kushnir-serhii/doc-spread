import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Recipient } from '@/lib/mock/types'
import { validateRecipient } from './recipient-validation'

export type RecipientFormValues = Pick<Recipient, 'name' | 'email'>

interface RecipientFormProps {
  initialValues: RecipientFormValues
  /** the saved list without the recipient being edited */
  others: Recipient[]
  submitLabel: string
  pending: boolean
  onSubmit: (values: RecipientFormValues) => void
  onCancel: () => void
}

export const RecipientForm = ({ initialValues, others, submitLabel, pending, onSubmit, onCancel }: RecipientFormProps) => {
  const id = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initialValues.name)
  const [email, setEmail] = useState(initialValues.email)
  const [submitted, setSubmitted] = useState(false)

  const errors = submitted ? validateRecipient(name, email, others) : { name: null, email: null }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    const found = validateRecipient(name, email, others)
    if (found.name) {
      nameRef.current?.focus()
      return
    }
    if (found.email) {
      emailRef.current?.focus()
      return
    }
    onSubmit({ name: name.trim(), email: email.trim() })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border bg-card p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          ref={nameRef}
          autoFocus
          value={name}
          disabled={pending}
          aria-invalid={errors.name !== null}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          onChange={(event) => setName(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="text-xs text-destructive">
            {errors.name}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          ref={emailRef}
          type="email"
          autoComplete="off"
          value={email}
          disabled={pending}
          aria-invalid={errors.email !== null}
          aria-describedby={errors.email ? `${id}-email-error` : undefined}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        {errors.email && (
          <p id={`${id}-email-error`} className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel} className="min-h-touch md:min-h-9">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="min-h-touch md:min-h-9">
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
