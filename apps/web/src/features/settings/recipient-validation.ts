import type { Recipient } from '@/lib/mock/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RecipientErrors {
  name: string | null
  email: string | null
}

/** `others` is the saved list without the recipient being edited. */
export const validateRecipient = (name: string, email: string, others: Recipient[]): RecipientErrors => {
  const trimmedEmail = email.trim()
  let emailError: string | null = null
  if (trimmedEmail === '') emailError = 'Enter an email address.'
  else if (!EMAIL_PATTERN.test(trimmedEmail)) emailError = 'Enter a valid email address.'
  else if (others.some((other) => other.email.toLowerCase() === trimmedEmail.toLowerCase())) {
    emailError = 'This email is already saved.'
  }
  return { name: name.trim() === '' ? 'Enter a name.' : null, email: emailError }
}
