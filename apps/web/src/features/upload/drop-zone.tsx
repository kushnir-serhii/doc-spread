import { useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from './upload-rules'
import { formatFileSize } from './format-file-size'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  /** Set when the company is at its monthly limit: the zone is disabled and says when it resets. */
  limitResetsOn?: string
}

export const DropZone = ({ onFiles, limitResetsOn }: DropZoneProps) => {
  const disabled = limitResetsOn !== undefined
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [dragging, setDragging] = useState(false)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (disabled) return
    setDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // leaving into a child element keeps the drag over the zone
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) onFiles(files)
    event.target.value = '' // allow choosing the same file again
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-input bg-card px-4 py-10 text-center transition-colors sm:py-14',
        dragging && 'border-primary bg-primary-soft',
        disabled && 'border-border bg-muted',
      )}
    >
      <UploadCloud
        aria-hidden
        className={cn('size-10 text-muted-foreground', dragging && 'text-primary-soft-foreground', disabled && 'opacity-60')}
      />
      {disabled ? (
        <div role="alert" className="flex flex-col gap-1">
          <p className="text-base font-medium">Monthly document limit reached</p>
          <p id={hintId} className="text-sm text-muted-foreground">
            Uploads are paused until the limit resets on {limitResetsOn}.
          </p>
        </div>
      ) : (
        <>
          <p className="text-base font-medium">{dragging ? 'Drop to add files' : 'Drag documents here'}</p>
          <p id={hintId} className="text-sm text-muted-foreground">
            PDF, JPG or PNG, up to {formatFileSize(MAX_UPLOAD_BYTES)} each
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        aria-describedby={hintId}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose files
      </Button>
    </div>
  )
}
