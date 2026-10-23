import { useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { SavedTypeBuilderSkeleton } from '@/features/document-types/saved-type-builder-skeleton'
import { readSavedNotice } from '@/features/document-types/saved-notice'
import { draftFromType } from '@/features/document-types/type-draft'
import { TypeBuilder } from '@/features/document-types/type-builder'
import { TypeNotFound } from '@/features/document-types/type-not-found'
import { TypesError } from '@/features/document-types/types-error'
import { useDocuments, useDocumentType } from '@/lib/api'

const TypePage = () => {
  const { typeId } = useParams()
  const location = useLocation()
  const { data, isPending, isError, refetch } = useDocumentType(typeId ?? null)
  // Not needed to render: while it loads or fails the save dialog just can't name a count.
  const documents = useDocuments({ typeId })
  // A saved version remounts the builder, so its message lives here. It belongs to one type.
  const [saved, setSaved] = useState<{ typeId: string; notice: string } | null>(null)

  if (!typeId) return <TypeNotFound title="Type not found" backTo="/types" backLabel="Back to types" />
  if (isError) return <TypesError title="Couldn't load the document type" onRetry={() => void refetch()} />
  if (isPending) return <SavedTypeBuilderSkeleton />

  const notice = saved?.typeId === typeId ? saved.notice : readSavedNotice(location.state)
  return (
    <TypeBuilder
      key={`${data.id}-${data.version}`}
      initialDraft={draftFromType(data)}
      savedType={{ id: data.id, version: data.version, documentCount: documents.data?.length ?? null }}
      notice={notice}
      onSaved={(message) => setSaved({ typeId, notice: message })}
    />
  )
}

export default TypePage
