import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { SampleLoader } from './sample-loader'
import { SampleUpload } from './sample-upload'

interface SampleTypeBuilderProps {
  /** An existing document to start from (an unclassified one); null = upload a sample first. */
  documentId: string | null
}

/** Entry of "type from a sample": pick or upload a sample, then read it and propose fields. */
export const SampleTypeBuilder = ({ documentId }: SampleTypeBuilderProps) => {
  const [uploadedId, setUploadedId] = useState<string | null>(null)
  const sampleId = documentId ?? uploadedId

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
      {sampleId ? <SampleLoader key={sampleId} documentId={sampleId} /> : <SampleUpload onUploaded={setUploadedId} />}
    </>
  )
}
