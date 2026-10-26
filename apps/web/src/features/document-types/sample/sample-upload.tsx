import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadProgress } from '@/features/upload/upload-progress'
import { validateFile } from '@/features/upload/upload-rules'
import { useUploadDocument } from '@/lib/api'
import { SampleDropZone } from './sample-drop-zone'

type UploadState =
  | { step: 'pick' }
  | { step: 'uploading'; file: File; progress: number }
  /** `file` is null when the file was refused before upload (nothing to retry). */
  | { step: 'error'; file: File | null; message: string }

interface SampleUploadProps {
  onUploaded: (documentId: string) => void
}

export const SampleUpload = ({ onUploaded }: SampleUploadProps) => {
  const [state, setState] = useState<UploadState>({ step: 'pick' })
  const upload = useUploadDocument()

  const start = (file: File) => {
    const check = validateFile(file)
    if (!check.ok) {
      setState({ step: 'error', file: null, message: `${file.name}: ${check.reason}.` })
      return
    }
    setState({ step: 'uploading', file, progress: 0 })
    upload.mutate(
      {
        file,
        onProgress: (progress) => setState((current) => (current.step === 'uploading' ? { ...current, progress } : current)),
      },
      {
        onSuccess: (doc) => onUploaded(doc.id),
        onError: (error) => setState({ step: 'error', file, message: error.message }),
      },
    )
  }

  const retryFile = state.step === 'error' ? state.file : null

  if (state.step === 'uploading') {
    const percent = Math.round(state.progress * 100)
    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-lg border bg-card p-6">
        <p role="status" className="min-w-0 truncate text-sm font-medium" title={state.file.name}>
          Uploading {state.file.name}… {percent}%
        </p>
        <UploadProgress label={`Uploading ${state.file.name}`} value={state.progress} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {state.step === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive bg-card p-4">
          <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Couldn’t upload the sample</p>
            <p className="text-sm break-words text-muted-foreground">{state.message}</p>
          </div>
          {retryFile && (
            <Button variant="outline" className="min-h-touch md:min-h-9" onClick={() => start(retryFile)}>
              Try again
            </Button>
          )}
        </div>
      )}
      <SampleDropZone onFile={start} />
    </div>
  )
}
