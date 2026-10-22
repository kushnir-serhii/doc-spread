import { AuthPlaceholder } from '@/features/auth/auth-placeholder'

const SignInPage = () => {
  return (
    <AuthPlaceholder
      title="Sign in"
      links={[
        { to: '/sign-up', label: 'Create an account' },
        { to: '/reset-password', label: 'Forgot password?' },
      ]}
    />
  )
}

export default SignInPage
