import { AuthPlaceholder } from '@/features/auth/auth-placeholder'

const SignUpPage = () => {
  return <AuthPlaceholder title="Create your account" links={[{ to: '/sign-in', label: 'I already have an account' }]} />
}

export default SignUpPage
