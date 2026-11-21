import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { NotAvailableYet } from '@/components/layout/not-available-yet'
import { PageHeader } from '@/components/layout/page-header'
import { TypeNotFound } from '@/features/document-types/type-not-found'
import { GroupBackLink } from '@/features/groups/group-back-link'
import { GroupValueView } from '@/features/groups/group-value-view'
import { GroupValuesEmpty } from '@/features/groups/group-values-empty'
import { GroupValuesError } from '@/features/groups/group-values-error'
import { GroupValuesSkeleton } from '@/features/groups/group-values-skeleton'
import { GroupValuesView } from '@/features/groups/group-values-view'
import { useDocumentTypes, useGroupValues } from '@/lib/api'
import { USE_MOCKS } from '@/lib/env'
import { totalFields } from '@/lib/fields/total-fields'

const GroupContent = () => {
  const { typeId = '', fieldId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const typesQuery = useDocumentTypes()
  const type = typesQuery.data?.find((candidate) => candidate.id === typeId)
  const field = type?.fields.find((candidate) => candidate.id === fieldId && candidate.groupable)
  // checked against the types first so the mock isn't asked for an invalid field
  const valuesQuery = useGroupValues(typeId, fieldId, { enabled: Boolean(field) })
  const values = valuesQuery.data ?? []
  const search = searchParams.get('q') ?? ''
  const selectedValue = searchParams.get('value') ?? ''

  const commitSearch = useCallback(
    (value: string) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value.trim()) next.set('q', value.trim())
          else next.delete('q')
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  const hrefFor = (value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('value', value)
    return `?${next.toString()}`
  }

  const valuesHref = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('value')
    const query = next.toString()
    return `/groups/${encodeURIComponent(typeId)}/${encodeURIComponent(fieldId)}${query ? `?${query}` : ''}`
  }

  if (typesQuery.isError) {
    return (
      <>
        <GroupBackLink />
        <GroupValuesError onRetry={() => void typesQuery.refetch()} />
      </>
    )
  }
  if (typesQuery.isPending) {
    return (
      <>
        <GroupBackLink />
        <GroupValuesSkeleton />
      </>
    )
  }
  if (!type || !field) {
    return (
      <>
        <GroupBackLink />
        <TypeNotFound title="This grouping doesn't exist" backTo="/groups" backLabel="Back to groups" />
      </>
    )
  }

  if (selectedValue) {
    return (
      <>
        <GroupBackLink to={valuesHref()} label={`${field.label} values`} />
        {valuesQuery.isError ? (
          <GroupValuesError onRetry={() => void valuesQuery.refetch()} />
        ) : valuesQuery.isPending ? (
          <GroupValuesSkeleton />
        ) : (
          <GroupValueView
            type={type}
            fieldId={field.id}
            values={values}
            value={selectedValue}
            valuesHref={valuesHref()}
          />
        )}
      </>
    )
  }

  return (
    <>
      <GroupBackLink />
      <PageHeader title={`${field.label} · ${type.name}`} description={`Values of “${field.label}” in ${type.name} documents.`} />
      {valuesQuery.isError ? (
        <GroupValuesError onRetry={() => void valuesQuery.refetch()} />
      ) : valuesQuery.isPending ? (
        <GroupValuesSkeleton />
      ) : values.length === 0 ? (
        <GroupValuesEmpty />
      ) : (
        <GroupValuesView
          values={values}
          totalFields={totalFields(type)}
          search={search}
          onSearchCommit={commitSearch}
          hrefFor={hrefFor}
        />
      )}
    </>
  )
}

/** Groups have no backend yet: with mocks off the page says so instead of showing mock data. */
const GroupPage = () =>
  USE_MOCKS ? (
    <GroupContent />
  ) : (
    <>
      <GroupBackLink />
      <NotAvailableYet
        title="Not available yet"
        description="Grouping documents by a field is not available yet."
        backTo="/groups"
        backLabel="Back to groups"
      />
    </>
  )

export default GroupPage
