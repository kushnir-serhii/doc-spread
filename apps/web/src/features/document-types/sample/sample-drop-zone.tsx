import { useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/features/upload/format-file-size'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/features/upload/upload-rules'
import { cn } from '@/lib/utils'

interface SampleDropZoneProps {
  onFile: (file: File) => void
}

/** One file only: the sample the type is built from. */
export const SampleDropZone = ({ onFile }: SampleDropZoneProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [dragging, setDragging] = useState(false)

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = '' // allow choosing the same file again
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-input bg-card px-4 py-10 text-center transition-colors sm:py-14',
        dragging && 'border-primary bg-primary-soft',
      )}
    >
      <UploadCloud aria-hidden className="size-10 text-muted-foreground" />
      <p className="text-base font-medium">{dragging ? 'Drop the sample here' : 'Drag one sample document here'}</p>
      <p id={hintId} className="text-sm text-muted-foreground">
        PDF, JPG or PNG, up to {formatFileSize(MAX_UPLOAD_BYTES)}. A typical, clean example works best.
      </p>
      <input ref={inputRef} type="file" accept={ACCEPT_ATTRIBUTE} onChange={handleChange} className="sr-only" tabIndex={-1} aria-hidden />
      <Button type="button" size="lg" className="min-h-11" aria-describedby={hintId} onClick={() => inputRef.current?.click()}>
        Choose a file
      </Button>
    </div>
  )
}
