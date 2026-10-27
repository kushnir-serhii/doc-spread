import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInviteMember } from '@/lib/api'
import { INVITE_ROLES } from '@/lib/mock/types'
import type { InviteRole, TeamMember } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { validateInviteEmail } from './invite-validation'

const ROLE_LABELS: Record<InviteRole, string> = { admin: 'Admin', member: 'Member' }

const isInviteRole = (value: string): value is InviteRole => INVITE_ROLES.some((role) => role === value)

type Result = { kind: 'none' } | { kind: 'success' | 'error'; message: string }

export interface InviteFormProps {
  members: TeamMember[]
}

export const InviteForm = ({ members }: InviteFormProps) => {
  const id = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const invite = useInviteMember()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('member')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<Result>({ kind: 'none' })

  const emailError = submitted ? validateInviteEmail(email, members) : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    setResult({ kind: 'none' })
    if (validateInviteEmail(email, members)) {
      emailRef.current?.focus()
      return
    }
    const target = email.trim()
    invite.mutate(
      { email: target, role },
      {
        onSuccess: () => {
          setEmail('')
          setSubmitted(false)
          setResult({ kind: 'success', message: `Invite sent to ${target}.` })
        },
        onError: (error) => setResult({ kind: 'error', message: error.message }),
      },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-md border bg-card p-4">
      <div>
        <h3 className="text-sm font-medium">Invite a teammate</h3>
        <p className="text-xs text-muted-foreground">
          Preview: no email is sent yet. The invite is added as pending.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          id={`${id}-email`}
          ref={emailRef}
          type="email"
          autoComplete="off"
          value={email}
          disabled={invite.isPending}
          aria-invalid={emailError !== null}
          aria-describedby={emailError ? `${id}-email-error` : undefined}
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
        <Label htmlFor={`${id}-role`}>Role</Label>
        <div className="relative">
          <select
            id={`${id}-role`}
            value={role}
            disabled={invite.isPending}
            onChange={(event) => {
              if (isInviteRole(event.target.value)) setRole(event.target.value)
            }}
            className={cn(
              'min-h-touch w-full appearance-none rounded-md border border-input bg-card pr-9 pl-3 text-sm shadow-xs outline-none md:min-h-9',
              'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {INVITE_ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={invite.isPending} className="min-h-touch w-full sm:w-auto md:min-h-9">
          {invite.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {invite.isPending ? 'Sending…' : 'Send invite'}
        </Button>
      </div>
      <p
        role={result.kind === 'error' ? 'alert' : 'status'}
        className={cn('text-sm break-words empty:hidden', result.kind === 'error' && 'text-destructive')}
      >
        {result.kind === 'none' ? '' : result.message}
      </p>
    </form>
  )
}
