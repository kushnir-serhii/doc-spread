import { useSearchParams } from 'react-router'
import { CompanyStep } from '@/features/onboarding/company-step'
import { OnboardingCard } from '@/features/onboarding/onboarding-card'
import { TypesStep } from '@/features/onboarding/types-step'

const OnboardingPage = () => {
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

export default OnboardingPage
