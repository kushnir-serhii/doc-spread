import { useDocument, useProposeFields } from '@/lib/api'
import { TypesError } from '../types-error'
import { ProcessingState } from './processing-state'
import { SampleWorkspace } from './sample-workspace'

interface SampleLoaderProps {
  documentId: string
}

/** Waits for the sample to be read, then for the proposals; each step says what it is doing. */
export const SampleLoader = ({ documentId }: SampleLoaderProps) => {
  const docQuery = useDocument(documentId)
  const reading = docQuery.data?.status === 'uploaded' || docQuery.data?.status === 'processing'
  const proposals = useProposeFields(documentId)

  if (docQuery.isError) {
    return <TypesError title="Couldn’t open the sample" onRetry={() => void docQuery.refetch()} />
  }
  if (docQuery.isPending || reading) return <ProcessingState message="Reading the document…" />
  if (proposals.isError) {
    return <TypesError title="Couldn’t propose fields" onRetry={() => void proposals.refetch()} />
  }
  if (proposals.isPending) return <ProcessingState message="Proposing fields…" />

  return <SampleWorkspace initialSamples={[documentId]} proposals={proposals.data} />
}
