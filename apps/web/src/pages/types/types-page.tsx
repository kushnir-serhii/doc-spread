import { PageHeader } from '@/components/layout/page-header'
import { NewTypeMenu } from '@/features/document-types/new-type-menu'
import { TypeRow } from '@/features/document-types/type-row'
import { TypesEmptyState } from '@/features/document-types/types-empty-state'
import { TypesError } from '@/features/document-types/types-error'
import { TypesSkeleton } from '@/features/document-types/types-skeleton'
import { useDocuments, useDocumentTypes } from '@/lib/api'

const TypesPage = () => {
  const typesQuery = useDocumentTypes()
  const documentsQuery = useDocuments()

  const isPending = typesQuery.isPending || documentsQuery.isPending
  const isError = typesQuery.isError || documentsQuery.isError
  const types = typesQuery.data ?? []
  const documents = documentsQuery.data ?? []

  const retry = () => {
    if (typesQuery.isError) void typesQuery.refetch()
    if (documentsQuery.isError) void documentsQuery.refetch()
  }

  return (
    <>
      <PageHeader
        title="Document types"
        description="The kinds of documents you collect and their fields."
        actions={types.length > 0 && !isError ? <NewTypeMenu /> : undefined}
      />
      {isError ? (
        <TypesError onRetry={retry} />
      ) : isPending ? (
        <TypesSkeleton />
      ) : types.length === 0 ? (
        <TypesEmptyState />
      ) : (
        <ul className="flex flex-col gap-2">
          {types.map((type) => {
            const own = documents.filter((d) => d.typeId === type.id)
            return (
              <li key={type.id}>
                <TypeRow
                  type={type}
                  documentCount={own.length}
                  reviewCount={own.filter((d) => d.status === 'needs_review').length}
                />
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export default TypesPage
