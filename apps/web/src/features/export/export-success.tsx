import { useId } from 'react'
import { CircleCheck, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadCsv } from './download-csv'
import type { ExportResult } from './export-result'
import { formatLabel } from './export-summary'

interface ExportSuccessProps {
  result: ExportResult
  onExportMore: () => void
  onViewHistory: () => void
}

const SERVER_NOTE = 'The file is generated on the server — download will be available once the backend is connected.'

/** Replaces the form after an export; focus moves here because the form (and its button) is gone. */
export const ExportSuccess = ({ result, onExportMore, onViewHistory }: ExportSuccessProps) => {
  const id = useId()
  const { file, recipient } = result
  const noun = result.count === 1 ? 'document' : 'documents'

  return (
    <div role="status" className="flex flex-col gap-4 rounded-lg border bg-success-soft p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success-soft-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            ref={(node) => node?.focus()}
            tabIndex={-1}
            className="text-base font-semibold wrap-break-word outline-none"
          >
            Exported {result.count} {result.typeName.toLowerCase()} {noun} as {formatLabel(result.format)}
          </h2>
          <p id={`${id}-detail`} className="text-sm wrap-break-word text-muted-foreground">
            {recipient ? `Sent to ${recipient}.` : file ? `Downloaded ${file.name}.` : SERVER_NOTE}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!recipient && (
          <Button
            type="button"
            variant="outline"
            className="min-h-touch md:min-h-9"
            disabled={!file}
            aria-describedby={file ? undefined : `${id}-detail`}
            onClick={() => file && downloadCsv(file)}
          >
            <Download aria-hidden />
            {file ? 'Download again' : 'Download'}
          </Button>
        )}
        <Button type="button" className="min-h-touch md:min-h-9" onClick={onExportMore}>
          Export more
        </Button>
        <Button type="button" variant="ghost" className="min-h-touch md:min-h-9" onClick={onViewHistory}>
          View history
        </Button>
      </div>
    </div>
  )
}
