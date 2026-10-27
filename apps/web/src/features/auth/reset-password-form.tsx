import { useId, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRequestPasswordReset } from '@/lib/api'
import { AuthError } from '@/lib/mock/types'
import { authErrorMessage, GENERIC_ERROR } from './auth-error-message'
import { emailMessage } from './auth-validation'

export interface ResetPasswordFormProps {
  initialEmail: string
  onSent: (email: string) => void
}

export const ResetPasswordForm = ({ initialEmail, onSent }: ResetPasswordFormProps) => {
  const id = useId()
  const requestReset = useRequestPasswordReset()
  const [email, setEmail] = useState(initialEmail)
  const [submitted, setSubmitted] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  const emailError = submitted ? emailMessage(email) : null
  const pending = requestReset.isPending
  const formError = requestReset.error
    ? requestReset.error instanceof AuthError
      ? authErrorMessage(requestReset.error.code)
      : GENERIC_ERROR
    : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (emailMessage(email) !== null) {
      emailRef.current?.focus()
      return
    }
    const trimmed = email.trim()
    requestReset.mutate({ email: trimmed }, { onSuccess: () => onSent(trimmed) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter the email you signed up with. We’ll send you a link to set a new password.
        </p>
      </div>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            ref={emailRef}
            type="email"
            autoComplete="email"
            autoFocus={initialEmail !== ''}
            value={email}
            aria-invalid={emailError !== null}
            aria-describedby={emailError ? `${id}-email-error` : undefined}
            disabled={pending}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-touch md:min-h-9"
          />
          {emailError && (
            <p id={`${id}-email-error`} className="text-xs text-destructive">
              {emailError}
            </p>
          )}
        </div>
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}
        <Button type="submit" disabled={pending} className="min-h-touch md:min-h-9">
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Link
        to="/sign-in"
        className="inline-flex min-h-touch w-fit items-center text-sm text-primary underline-offset-4 hover:underline md:min-h-0"
      >
        Back to sign in
      </Link>
    </div>
  )
}
