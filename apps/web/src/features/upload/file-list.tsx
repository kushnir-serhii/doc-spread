import { useId } from 'react'
import { FileRow } from './file-row'
import type { RejectedFile } from './upload-entries'
import { UploadRow } from './upload-row'
import type { UploadItem } from './use-file-states'

interface FileListProps {
  items: UploadItem[]
  rejected: RejectedFile[]
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  onDismiss: (id: string) => void
}

export const FileList = ({ items, rejected, onRetry, onRemove, onDismiss }: FileListProps) => {
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
      {items.length > 0 && (
        <section aria-labelledby={acceptedHeadingId} className="flex flex-col gap-2">
          <h2 id={acceptedHeadingId} className="text-sm font-semibold">
            Files ({items.length})
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {items.map((item) => (
              <UploadRow key={item.id} item={item} onRetry={() => onRetry(item.id)} onRemove={() => onRemove(item.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
