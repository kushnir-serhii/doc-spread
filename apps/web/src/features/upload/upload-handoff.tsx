import { useDocumentTypes } from '@/lib/api'
import { isSettled, sharedType } from './file-state'
import type { FileCounts } from './file-state'
import { TypesSuggestion } from './types-suggestion'
import { UploadSummary } from './upload-summary'
import type { UploadItem } from './use-file-states'

interface UploadHandoffProps {
  items: UploadItem[]
  counts: FileCounts
  onRetryFailed: () => void
}

/** What to do next: a summary once everything is uploaded, and a nudge to make a type when there are none. */
export const UploadHandoff = ({ items, counts, onRetryFailed }: UploadHandoffProps) => {
  const types = useDocumentTypes()
  // unknown while loading or on error, so no suggestion then
  const hasNoTypes = types.data !== undefined && types.data.length === 0
  const documents = items.flatMap((item) =>
    item.state.kind === 'classified' || item.state.kind === 'unclassified'
      ? [{ id: item.state.documentId, name: item.file.name }]
      : [],
  )
  const settled = isSettled(counts)

  if (!settled && !(hasNoTypes && documents.length > 0)) return null
  return (
    <div className="flex flex-col gap-4">
      {settled && (
        <UploadSummary
          counts={counts}
          sharedType={sharedType(items.map((item) => item.state))}
          onRetryFailed={onRetryFailed}
        />
      )}
      {hasNoTypes && documents.length > 0 && <TypesSuggestion documents={documents} />}
    </div>
  )
}
