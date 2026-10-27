import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export interface ResetPasswordSentProps {
  email: string
  onUseDifferentEmail: () => void
}

export const ResetPasswordSent = ({ email, onUseDifferentEmail }: ResetPasswordSentProps) => {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
          Check your email
        </h1>
        <p role="status" className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground break-all">{email}</span>, we’ve sent
          a link to reset your password. Check your inbox and spam folder.
        </p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onUseDifferentEmail} className="min-h-touch md:min-h-9">
          Use a different email
        </Button>
        <Button asChild className="min-h-touch md:min-h-9">
          <Link to="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    </div>
  )
}
