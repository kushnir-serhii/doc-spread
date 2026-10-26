import type { ComponentProps } from 'react'
import { DocumentViewer } from '@/features/documents/viewer/document-viewer'
import { useDocument } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { TypesError } from '../types-error'

type ViewerProps = Omit<ComponentProps<typeof DocumentViewer>, 'documentId' | 'file'>

interface SampleViewerProps extends ViewerProps {
  documentId: string
}

/** The active sample in the viewer, once it has been read; a skeleton or an error with retry before that. */
export const SampleViewer = ({ documentId, ...viewer }: SampleViewerProps) => {
  const doc = useDocument(documentId)
  if (doc.isError) return <TypesError title="Couldn’t open the sample" onRetry={() => void doc.refetch()} />
  if (doc.isPending || doc.data.status === 'uploaded' || doc.data.status === 'processing') {
    return (
      <div role="status" className="flex h-full flex-col gap-2">
        <span className="text-sm font-medium">Reading the document…</span>
        <Skeleton className="w-full flex-1 rounded-lg" />
      </div>
    )
  }
  return <DocumentViewer documentId={documentId} file={doc.data.file} {...viewer} />
}
