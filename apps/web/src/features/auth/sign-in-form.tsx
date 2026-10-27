import { useId, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSignIn } from '@/lib/api'
import { AuthError } from '@/lib/mock/types'
import type { AuthErrorCode } from '@/lib/mock/types'
import { PasswordInput } from './password-input'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENERIC_ERROR = 'Something went wrong. Try again.'

const authErrorMessage = (code: AuthErrorCode): string => {
  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.'
    case 'rate_limited':
      return 'Too many attempts. Wait a few minutes and try again.'
    case 'email_taken':
      return GENERIC_ERROR
    default: {
      const unreachable: never = code
      return unreachable
    }
  }
}

const emailMessage = (email: string): string | null => {
  const trimmed = email.trim()
  if (trimmed === '') return 'Enter your email.'
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.'
  return null
}

export const SignInForm = () => {
  const id = useId()
  const navigate = useNavigate()
  const signIn = useSignIn()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const emailError = submitted ? emailMessage(email) : null
  const passwordError = submitted && password === '' ? 'Enter your password.' : null
  const pending = signIn.isPending
  const formError = signIn.error
    ? signIn.error instanceof AuthError
      ? authErrorMessage(signIn.error.code)
      : GENERIC_ERROR
    : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (emailMessage(email) !== null) {
      emailRef.current?.focus()
      return
    }
    if (password === '') {
      passwordRef.current?.focus()
      return
    }
    signIn.mutate({ email: email.trim(), password }, { onSuccess: () => void navigate('/inbox') })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          ref={emailRef}
          type="email"
          autoComplete="email"
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
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-password`}>Password</Label>
        <PasswordInput
          id={`${id}-password`}
          ref={passwordRef}
          autoComplete="current-password"
          value={password}
          aria-invalid={passwordError !== null}
          aria-describedby={passwordError ? `${id}-password-error` : undefined}
          disabled={pending}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        {passwordError && (
          <p id={`${id}-password-error`} className="text-xs text-destructive">
            {passwordError}
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
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
