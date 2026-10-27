import { Link } from 'react-router'
import { SignUpForm } from '@/features/auth/sign-up-form'

const SignUpPage = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start turning documents into spreadsheets.</p>
      </div>
      <SignUpForm />
      <p className="inline-flex min-h-touch flex-wrap items-center gap-x-1 text-sm text-muted-foreground md:min-h-0">
        Already have an account?
        <Link
          to="/sign-in"
          className="inline-flex min-h-touch items-center text-primary underline-offset-4 hover:underline md:min-h-0"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default SignUpPage
