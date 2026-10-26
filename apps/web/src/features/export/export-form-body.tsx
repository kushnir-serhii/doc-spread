import { useRef, useState } from 'react'
import { useSelection } from '@/features/documents/use-selection'
import { restoreExportMapping } from '@/lib/fields/export-mapping'
import type { Document, DocumentType, ExportColumnMapping, ExportMapping } from '@/lib/mock/types'
import { ColumnMapping } from './column-mapping'
import { DestinationFieldset } from './destination-fieldset'
import { DEFAULT_EXPORT_OPTIONS } from './export-options'
import type { ExportOptions } from './export-options'
import { ExportDocumentList } from './export-document-list'
import type { ExportResult } from './export-result'
import { ExportSubmit } from './export-submit'
import { FormatFieldset } from './format-fieldset'
import { initialSelection } from './initial-selection'

interface ExportFormBodyProps {
  type: DocumentType
  /** approved documents of the type */
  documents: Document[]
  /** raw ?ids= value */
  idsParam: string | null
  /** the type's saved mapping; null when none was saved yet */
  savedMapping: ExportMapping | null
  onExported: (result: ExportResult) => void
}

/** Holds the selection, options and mapping. Mount with key={type.id} once the saved mapping has loaded. */
export const ExportFormBody = ({ type, documents, idsParam, savedMapping, onExported }: ExportFormBodyProps) => {
  const selection = useSelection(documents, initialSelection(documents, idsParam))
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS)
  const [mapping, setMapping] = useState<ExportColumnMapping>(() => restoreExportMapping(type, savedMapping))
  const [attempted, setAttempted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = documents.filter((doc) => selection.has(doc.id))

  // the address field comes before the columns on the page, so it is the first problem when both are wrong
  const onBlocked = (problem: 'address' | 'headers') => {
    setAttempted(true)
    const selector = problem === 'address' ? 'input[type="email"]' : 'input[aria-invalid="true"]'
    rootRef.current?.querySelector<HTMLInputElement>(selector)?.focus()
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-8">
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
          showErrors={attempted}
          onChange={(destination) => setOptions((prev) => ({ ...prev, destination }))}
        />
      </div>
      <section aria-labelledby="export-columns" className="flex flex-col gap-3">
        <h2 id="export-columns" className="text-sm font-semibold">
          Columns
        </h2>
        <ColumnMapping type={type} format={options.format} mapping={mapping} onChange={setMapping} documents={selected} />
      </section>
      <ExportSubmit
        type={type}
        selected={selected}
        options={options}
        mapping={mapping}
        attempted={attempted}
        onBlocked={onBlocked}
        onExported={onExported}
      />
    </div>
  )
}
