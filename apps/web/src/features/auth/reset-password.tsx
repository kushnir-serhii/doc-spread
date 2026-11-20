import { useState } from 'react'
import { NotAvailableYet } from '@/components/layout/not-available-yet'
import { USE_MOCKS } from '@/lib/env'
import { ResetPasswordForm } from './reset-password-form'
import { ResetPasswordSent } from './reset-password-sent'

type ResetStep = { step: 'form'; email: string } | { step: 'sent'; email: string }

export const ResetPassword = () =>
  USE_MOCKS ? (
    <ResetPasswordSteps />
  ) : (
    <NotAvailableYet
      title="Not available yet"
      description="Password reset is not available yet because there is no email service."
      backTo="/sign-in"
      backLabel="Back to sign in"
    />
  )

const ResetPasswordSteps = () => {
  const [state, setState] = useState<ResetStep>({ step: 'form', email: '' })

  switch (state.step) {
    case 'form':
      return <ResetPasswordForm initialEmail={state.email} onSent={(email) => setState({ step: 'sent', email })} />
    case 'sent':
      return (
        <ResetPasswordSent
          email={state.email}
          onUseDifferentEmail={() => setState({ step: 'form', email: state.email })}
        />
      )
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}
