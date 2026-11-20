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
      <OnboardingCard width="wide" step={2} title="What documents do you process?">
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

/** Onboarding has no backend yet (sign-up already creates the company): with mocks off the page says so. */
const OnboardingPage = () =>
  USE_MOCKS ? (
    <OnboardingSteps />
  ) : (
    <div className="w-full max-w-sm">
      <NotAvailableYet
        title="Not available yet"
        description="Setup steps are not available yet. Signing up already created your company."
        backTo="/types"
        backLabel="Go to document types"
      />
    </div>
  )

export default OnboardingPage
