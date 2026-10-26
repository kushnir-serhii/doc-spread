import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { readSavedNotice } from '@/features/document-types/saved-notice'
import { SavedTypeBuilderSkeleton } from '@/features/document-types/saved-type-builder-skeleton'
import { SampleWorkspace } from '@/features/document-types/sample/sample-workspace'
import { MAX_SAMPLES } from '@/features/document-types/sample/use-samples'
import { draftFromType } from '@/features/document-types/type-draft'
import { TypeNotFound } from '@/features/document-types/type-not-found'
import { TypesError } from '@/features/document-types/types-error'
import { useDocuments, useDocumentType } from '@/lib/api'

interface Saved {
  typeId: string
  notice: string
  samples: string[]
}

const TrainTypePage = () => {
  const { typeId } = useParams()
  const location = useLocation()
  const { data, isPending, isError, refetch } = useDocumentType(typeId ?? null)
  const documents = useDocuments({ typeId })
  // A saved version remounts the workspace (its baseline is the saved type), so the message and samples live here.
  const [saved, setSaved] = useState<Saved | null>(null)

  if (!typeId) return <TypeNotFound title="Type not found" backTo="/types" backLabel="Back to types" />
  if (isError) return <TypesError title="Couldn't load the document type" onRetry={() => void refetch()} />
  if (isPending) return <SavedTypeBuilderSkeleton />

  const own = saved?.typeId === typeId ? saved : null
  // The documents the examples came from, in the order of first use.
  const fromExamples = [...new Set(data.fields.flatMap((field) => field.examples.map((example) => example.documentId)))]

  return (
    <>
      <Link
        to={`/types/${typeId}`}
        className="mb-4 -ml-2 inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to {data.name}
      </Link>
      <PageHeader title={`Train ${data.name}`} description={`Test the fields on up to ${MAX_SAMPLES} documents and point at what is missing or wrong.`} />
      <SampleWorkspace
        key={`${data.id}-${data.version}`}
        initialDraft={draftFromType(data)}
        initialSamples={own?.samples ?? fromExamples.slice(0, MAX_SAMPLES)}
        proposals={[]}
        savedType={{ id: data.id, version: data.version, documentCount: documents.data?.length ?? null }}
        notice={own?.notice ?? readSavedNotice(location.state)}
        onSaved={(notice, samples) => setSaved({ typeId, notice, samples })}
      />
    </>
  )
}

export default TrainTypePage
