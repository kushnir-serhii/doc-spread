import { useExportMapping } from '@/lib/api'
import type { Document, DocumentType } from '@/lib/mock/types'
import { ExportError } from './export-error'
import { ExportFormBody } from './export-form-body'
import { ExportSkeleton } from './export-skeleton'

interface ExportFormProps {
  type: DocumentType
  /** approved documents of the type */
  documents: Document[]
  /** raw ?ids= value */
  idsParam: string | null
}

/** Mount with key={type.id}. Waits for the saved column mapping so the form can start from it. */
export const ExportForm = ({ type, documents, idsParam }: ExportFormProps) => {
  const mapping = useExportMapping(type.id)
  if (mapping.isError) return <ExportError onRetry={() => void mapping.refetch()} />
  if (mapping.isPending) return <ExportSkeleton />
  return <ExportFormBody type={type} documents={documents} idsParam={idsParam} savedMapping={mapping.data} />
}
