import { Link } from 'react-router'
import { SignInForm } from '@/features/auth/sign-in-form'

const SignInPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">Welcome back to DocSpread.</p>
      </div>
      <SignInForm />
      <div className="flex flex-col text-sm">
        <Link
          to="/reset-password"
          className="inline-flex min-h-touch w-fit items-center text-primary underline-offset-4 hover:underline md:min-h-0"
        >
          Forgot password?
        </Link>
        <p className="inline-flex min-h-touch flex-wrap items-center gap-x-1 text-muted-foreground md:min-h-0">
          Don’t have an account?
          <Link
            to="/sign-up"
            className="inline-flex min-h-touch items-center text-primary underline-offset-4 hover:underline md:min-h-0"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default SignInPage
