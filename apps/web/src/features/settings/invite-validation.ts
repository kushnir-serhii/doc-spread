import type { TeamMember } from '@/lib/mock/types'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns an error message, or `null` when the email can be invited. */
export const validateInviteEmail = (email: string, members: TeamMember[]): string | null => {
  const trimmed = email.trim()
  if (trimmed === '') return 'Enter an email address.'
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.'
  if (members.some((member) => member.email.toLowerCase() === trimmed.toLowerCase())) {
    return 'This email is already on the team.'
  }
  return null
}
