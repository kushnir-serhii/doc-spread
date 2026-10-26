import { useId, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompany, useCreateExportJob } from '@/lib/api'
import type { CreateExportJobInput, Document, DocumentType, ExportColumnMapping } from '@/lib/mock/types'
import { buildCsvFile, isSingleCsvFile } from './build-csv'
import { downloadCsv } from './download-csv'
import { headerErrors } from './export-header-errors'
import { addressError, resolveRecipient } from './export-options'
import type { ExportOptions } from './export-options'
import { buildExportPlan } from './export-plan'
import type { ExportResult } from './export-result'
import { destinationText, moneyTotals } from './export-summary'
import { SubmitSummary } from './submit-summary'

interface ExportSubmitProps {
  type: DocumentType
  /** the selected documents, in list order */
  selected: Document[]
  options: ExportOptions
  mapping: ExportColumnMapping
  /** a submit was blocked before: problems are shown */
  attempted: boolean
  /** the form has problems: show them and focus the first */
  onBlocked: (problem: 'address' | 'headers') => void
  onExported: (result: ExportResult) => void
}

interface Attempt {
  input: CreateExportJobInput
  result: ExportResult
}

/** Summary, the Export button and its pending / error states. */
export const ExportSubmit = ({ type, selected, options, mapping, attempted, onBlocked, onExported }: ExportSubmitProps) => {
  const id = useId()
  const mutation = useCreateExportJob()
  const recipients = useCompany().data?.recipients ?? []
  const [last, setLast] = useState<Attempt>()
  const { format, destination } = options

  const plan = buildExportPlan(type, mapping, format)
  const recipient = resolveRecipient(destination, recipients)
  const hasHeaderErrors = format !== 'pdf_bundle' && headerErrors(type, mapping, format).size > 0
  const addressProblem = destination.kind === 'email' ? addressError(recipient ?? '') : undefined
  // the address error is inline at its field; after a blocked attempt this one follows the form until fixed
  const problem = attempted && hasHeaderErrors ? 'Fix the column names marked above, then export.' : undefined
  const empty = selected.length === 0
  const pending = mutation.isPending

  const run = async ({ input, result }: Attempt) => {
    const done = await mutation.mutateAsync(input).then(
      () => true,
      () => false,
    )
    if (!done) return
    onExported(result)
    if (result.file && input.destination === 'download') downloadCsv(result.file)
  }

  const submit = () => {
    if (hasHeaderErrors || addressProblem) {
      onBlocked(addressProblem ? 'address' : 'headers')
      return
    }
    // the documents leave the approved list once exported, so the file is built from them now
    const file = isSingleCsvFile(plan, format) ? buildCsvFile(plan, selected, type.name, new Date()) : undefined
    const attempt: Attempt = {
      input: {
        typeId: type.id,
        documentIds: selected.map((doc) => doc.id),
        format,
        destination: destination.kind,
        recipient,
        columns: mapping,
      },
      result: { typeId: type.id, typeName: type.name, count: selected.length, format, recipient, file },
    }
    setLast(attempt)
    void run(attempt)
  }

  // resubmits the same input, even if the form changed since
  const retry = () => {
    if (last) void run(last)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <h2 id={`${id}-title`} className="text-sm font-semibold">
        Summary
      </h2>
      <SubmitSummary
        count={selected.length}
        totals={moneyTotals(type, mapping, format, selected)}
        format={format}
        destination={destinationText(destination, recipients)}
      />
      {mutation.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border bg-danger-soft p-3 text-sm">
          <p className="text-danger-soft-foreground">The export failed. Nothing was changed.</p>
          <Button type="button" variant="outline" className="min-h-touch md:min-h-9" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      <p role="alert" className="text-sm text-danger empty:hidden">
        {problem}
      </p>
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          className="min-h-touch w-full md:min-h-9 md:w-fit"
          disabled={empty || pending}
          aria-describedby={empty ? `${id}-reason` : undefined}
          onClick={submit}
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? 'Exporting…' : 'Export'}
        </Button>
        {empty && (
          <p id={`${id}-reason`} className="text-sm text-muted-foreground">
            Select at least one document to export.
          </p>
        )}
      </div>
    </section>
  )
}
