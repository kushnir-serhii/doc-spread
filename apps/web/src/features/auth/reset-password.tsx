import { useState } from 'react'
import { ResetPasswordForm } from './reset-password-form'
import { ResetPasswordSent } from './reset-password-sent'

type ResetStep = { step: 'form'; email: string } | { step: 'sent'; email: string }

export const ResetPassword = () => {
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
