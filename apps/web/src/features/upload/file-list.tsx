import { useId } from 'react'
import { FileRow } from './file-row'
import type { RejectedFile, UploadEntry } from './upload-entries'

interface FileListProps {
  entries: UploadEntry[]
  rejected: RejectedFile[]
  onRemove: (id: string) => void
  onDismiss: (id: string) => void
}

export const FileList = ({ entries, rejected, onRemove, onDismiss }: FileListProps) => {
  const rejectedHeadingId = useId()
  const acceptedHeadingId = useId()
  return (
    <div className="flex flex-col gap-6">
      {rejected.length > 0 && (
        <section aria-labelledby={rejectedHeadingId} className="flex flex-col gap-2">
          <h2 id={rejectedHeadingId} className="text-sm font-semibold text-danger-soft-foreground">
            Rejected ({rejected.length})
          </h2>
          <ul className="divide-y divide-border rounded-md border border-danger bg-danger-soft">
            {rejected.map((file) => (
              <FileRow
                key={file.id}
                name={file.name}
                size={file.size}
                note={file.reason}
                removeLabel={`Dismiss ${file.name}`}
                onRemove={() => onDismiss(file.id)}
              />
            ))}
          </ul>
        </section>
      )}
      {entries.length > 0 && (
        <section aria-labelledby={acceptedHeadingId} className="flex flex-col gap-2">
          <h2 id={acceptedHeadingId} className="text-sm font-semibold">
            Ready to upload ({entries.length})
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {entries.map((entry) => (
              <FileRow
                key={entry.id}
                name={entry.file.name}
                size={entry.file.size}
                removeLabel={`Remove ${entry.file.name}`}
                onRemove={() => onRemove(entry.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
