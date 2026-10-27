const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const emailMessage = (email: string): string | null => {
  const trimmed = email.trim()
  if (trimmed === '') return 'Enter your email.'
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.'
  return null
}
