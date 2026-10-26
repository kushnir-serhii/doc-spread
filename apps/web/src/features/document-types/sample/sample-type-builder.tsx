import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useDemoDocuments } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { SampleLoader } from './sample-loader'
import { SampleUpload } from './sample-upload'
import { UNREADABLE_MESSAGE } from './unreadable-notice'

interface SampleTypeBuilderProps {
  /** An existing document to start from (an unclassified one); null = upload a sample first. */
  documentId: string | null
}

/** Entry of "type from a sample": pick or upload a sample, then read it and propose fields. */
export const SampleTypeBuilder = ({ documentId }: SampleTypeBuilderProps) => {
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const sampleId = documentId ?? uploadedId
  const demoId = useDemoDocuments()[0]?.data?.id

  return (
    <>
      <Link
        to="/types/new"
        className="mb-4 -ml-2 inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to new type
      </Link>
      <PageHeader title="Type from a sample" description="Show a real document and AI suggests the fields to extract." />
      {sampleId ? (
        <SampleLoader key={sampleId} documentId={sampleId} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{UNREADABLE_MESSAGE}</p>
          <SampleUpload onUploaded={setUploadedId} />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="min-h-touch md:min-h-9"
              disabled={demoId === undefined}
              onClick={() => demoId && setUploadedId(demoId)}
            >
              Try with an example document
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
