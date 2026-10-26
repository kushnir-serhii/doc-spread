import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyForm, type CompanyFormValues } from '@/features/company/company-form'
import { useCompany, useUpdateCompany } from '@/lib/api'

export const CompanyStep = () => {
  const navigate = useNavigate()
  const company = useCompany()
  const update = useUpdateCompany()

  const handleSubmit = (values: CompanyFormValues) => {
    update.mutate(values, { onSuccess: () => void navigate('/onboarding?step=types') })
  }

  if (company.isPending) {
    return (
      <div role="status" aria-label="Loading company" className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }

  if (company.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p>Could not load your company.</p>
        <Button type="button" variant="outline" className="min-h-touch md:min-h-9" onClick={() => void company.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <CompanyForm
      initialValues={company.data}
      onSubmit={handleSubmit}
      pending={update.isPending}
      error={update.isError ? update.error.message : null}
      submitLabel="Continue"
    />
  )
}
