import { useParams } from 'react-router'
import { SavedTypeBuilderSkeleton } from '@/features/document-types/saved-type-builder-skeleton'
import { draftFromType } from '@/features/document-types/type-draft'
import { TypeBuilder } from '@/features/document-types/type-builder'
import { TypeNotFound } from '@/features/document-types/type-not-found'
import { TypesError } from '@/features/document-types/types-error'
import { useDocumentType } from '@/lib/api'

const TypePage = () => {
  const { typeId } = useParams()
  const { data, isPending, isError, refetch } = useDocumentType(typeId ?? null)

  if (!typeId) return <TypeNotFound title="Type not found" backTo="/types" backLabel="Back to types" />
  if (isError) return <TypesError title="Couldn't load the document type" onRetry={() => void refetch()} />
  if (isPending) return <SavedTypeBuilderSkeleton />
  return <TypeBuilder key={data.id} initialDraft={draftFromType(data)} />
}

export default TypePage
