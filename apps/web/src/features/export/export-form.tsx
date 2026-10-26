import { useState } from 'react'
import { useSelection } from '@/features/documents/use-selection'
import type { Document, DocumentType } from '@/lib/mock/types'
import { DestinationFieldset } from './destination-fieldset'
import { DEFAULT_EXPORT_OPTIONS } from './export-options'
import type { ExportOptions } from './export-options'
import { ExportDocumentList } from './export-document-list'
import { FormatFieldset } from './format-fieldset'
import { initialSelection } from './initial-selection'

interface ExportFormProps {
  type: DocumentType
  /** approved documents of the type */
  documents: Document[]
  /** raw ?ids= value */
  idsParam: string | null
}

/** Mount with key={type.id}: the selection and options start fresh for each type. */
export const ExportForm = ({ type, documents, idsParam }: ExportFormProps) => {
  const selection = useSelection(documents, initialSelection(documents, idsParam))
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS)

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="export-documents" className="flex flex-col gap-2">
        <h2 id="export-documents" className="text-sm font-semibold">
          Documents
        </h2>
        <ExportDocumentList documents={documents} type={type} selection={selection} />
      </section>
      <div className="grid gap-8 md:grid-cols-2">
        <FormatFieldset value={options.format} onChange={(format) => setOptions((prev) => ({ ...prev, format }))} />
        <DestinationFieldset
          value={options.destination}
          onChange={(destination) => setOptions((prev) => ({ ...prev, destination }))}
        />
      </div>
    </div>
  )
}
