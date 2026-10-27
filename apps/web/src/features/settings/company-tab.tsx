import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyForm, type CompanyFormValues } from '@/features/company/company-form'
import { useCompany, useUpdateCompany } from '@/lib/api'
import { LocaleSettings } from './locale-settings'

export const CompanyTab = () => {
  const company = useCompany()
  const update = useUpdateCompany()
  const [saved, setSaved] = useState(false)

  const handleSubmit = (values: CompanyFormValues) => {
    setSaved(false)
    update.mutate(values, { onSuccess: () => setSaved(true) })
  }

  if (company.isPending) {
    return (
      <div role="status" aria-label="Loading company" className="flex max-w-lg flex-col gap-4">
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
    <div className="flex max-w-lg flex-col gap-4">
      <CompanyForm
        initialValues={company.data}
        onSubmit={handleSubmit}
        pending={update.isPending}
        error={update.isError ? update.error.message : null}
        submitLabel="Save"
      />
      <p role="status" className="text-sm text-muted-foreground">
        {saved && !update.isPending && !update.isError ? 'Company details saved.' : ''}
      </p>
      <LocaleSettings company={company.data} />
    </div>
  )
}
