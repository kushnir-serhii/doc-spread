import { useId, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSignUp } from '@/lib/api'
import { AuthError } from '@/lib/mock/types'
import { authErrorMessage, GENERIC_ERROR } from './auth-error-message'
import { emailMessage } from './auth-validation'
import { PasswordInput } from './password-input'

const nameMessage = (name: string): string | null => (name.trim() === '' ? 'Enter your name.' : null)
const passwordMessage = (password: string): string | null =>
  password.length < 8 ? 'Use at least 8 characters.' : null

export const SignUpForm = () => {
  const id = useId()
  const navigate = useNavigate()
  const signUp = useSignUp()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const nameError = submitted ? nameMessage(name) : null
  const emailError = submitted ? emailMessage(email) : null
  const passwordError = submitted ? passwordMessage(password) : null
  const pending = signUp.isPending
  const error = signUp.error
  const emailTaken = error instanceof AuthError && error.code === 'email_taken'
  const formError = error ? (error instanceof AuthError ? authErrorMessage(error.code) : GENERIC_ERROR) : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (nameMessage(name) !== null) {
      nameRef.current?.focus()
      return
    }
    if (emailMessage(email) !== null) {
      emailRef.current?.focus()
      return
    }
    if (passwordMessage(password) !== null) {
      passwordRef.current?.focus()
      return
    }
    signUp.mutate(
      { name: name.trim(), email: email.trim(), password },
      { onSuccess: () => void navigate('/onboarding') },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Full name</Label>
        <Input
          id={`${id}-name`}
          ref={nameRef}
          type="text"
          autoComplete="name"
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
          autoComplete="new-password"
          value={password}
          aria-invalid={passwordError !== null}
          aria-describedby={
            passwordError ? `${id}-password-hint ${id}-password-error` : `${id}-password-hint`
          }
          disabled={pending}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        <p id={`${id}-password-hint`} className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
        {passwordError && (
          <p id={`${id}-password-error`} className="text-xs text-destructive">
            {passwordError}
          </p>
        )}
      </div>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
          {emailTaken && (
            <>
              {' '}
              <Link
                to="/sign-in"
                className="inline-flex min-h-touch items-center underline underline-offset-4 md:min-h-0"
              >
                Sign in instead
              </Link>
            </>
          )}
        </p>
      )}
      <Button type="submit" disabled={pending} className="min-h-touch md:min-h-9">
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
