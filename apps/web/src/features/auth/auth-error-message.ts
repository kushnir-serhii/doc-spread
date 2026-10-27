import type { AuthErrorCode } from '@/lib/mock/types'

export const GENERIC_ERROR = 'Something went wrong. Try again.'

export const authErrorMessage = (code: AuthErrorCode): string => {
  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.'
    case 'rate_limited':
      return 'Too many attempts. Wait a few minutes and try again.'
    case 'email_taken':
      return 'An account with this email already exists.'
    default: {
      const unreachable: never = code
      return unreachable
    }
  }
}
