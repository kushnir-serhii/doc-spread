import { AuthPlaceholder } from '@/features/auth/auth-placeholder'

const ResetPasswordPage = () => {
  return <AuthPlaceholder title="Reset password" links={[{ to: '/sign-in', label: 'Back to sign in' }]} />
}

export default ResetPasswordPage
