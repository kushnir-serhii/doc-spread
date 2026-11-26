import { useSearchParams } from 'react-router'
import { NotAvailableYet } from '@/components/layout/not-available-yet'
import { CompanyStep } from '@/features/onboarding/company-step'
import { OnboardingCard } from '@/features/onboarding/onboarding-card'
import { TypesStep } from '@/features/onboarding/types-step'
import { USE_MOCKS } from '@/lib/env'

const OnboardingSteps = () => {
  const [searchParams] = useSearchParams()

  if (searchParams.get('step') === 'types') {
    return (
      <OnboardingCard width="wide" step={USE_MOCKS ? 2 : undefined} title="What documents do you process?">
        <TypesStep />
      </OnboardingCard>
    )
  }
  return (
    <OnboardingCard width="narrow" step={1} title="Set up your company">
      <CompanyStep />
    </OnboardingCard>
  )
}

/** With mocks off only the types step is real (sign-up already created the company); the company step says so. */
const OnboardingPage = () => {
  const [searchParams] = useSearchParams()
  if (USE_MOCKS || searchParams.get('step') === 'types') return <OnboardingSteps />
  return (
    <div className="w-full max-w-sm">
      <NotAvailableYet
        title="Not available yet"
        description="Company setup is not available yet. Signing up already created your company; pick your document types in the next step."
        backTo="/onboarding?step=types"
        backLabel="Choose document types"
      />
    </div>
  )
}

export default OnboardingPage
