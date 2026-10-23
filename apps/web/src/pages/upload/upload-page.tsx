import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { DropZone } from '@/features/upload/drop-zone'
import { FileList } from '@/features/upload/file-list'
import { TypeSelect } from '@/features/upload/type-select'
import { countStates, describeCounts } from '@/features/upload/file-state'
import { classifyFiles, describeResult } from '@/features/upload/upload-entries'
import type { RejectedFile } from '@/features/upload/upload-entries'
import { useFileStates } from '@/features/upload/use-file-states'
import { useUploadQueue } from '@/features/upload/use-upload-queue'
import { useDocumentTypes } from '@/lib/api'

const UploadPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const types = useDocumentTypes()
  const [rejected, setRejected] = useState<RejectedFile[]>([])
  const [announcement, setAnnouncement] = useState('')

  // an unknown id falls back to "Detect automatically"; until types load, trust the URL
  const requested = searchParams.get('type') ?? ''
  const typeId = types.data && !types.data.some((type) => type.id === requested) ? '' : requested

  const queue = useUploadQueue(typeId)
  const items = useFileStates(queue.entries)
  const statusSummary = describeCounts(countStates(items.map((item) => item.state)))

  const handleTypeChange = (next: string) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next) params.set('type', next)
        else params.delete('type')
        return params
      },
      { replace: true },
    )
  }

  const handleFiles = (files: File[]) => {
    const result = classifyFiles(files)
    queue.add(result.accepted)
    setRejected((prev) => [...prev, ...result.rejected])
    setAnnouncement(describeResult(result))
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Upload" description="Drop PDF, JPG or PNG files. We detect the type of each one." />
      <div className="flex flex-col gap-6">
        <TypeSelect value={typeId} onChange={handleTypeChange} />
        <DropZone onFiles={handleFiles} />
        <p role="status" className="sr-only">
          {[announcement, statusSummary].filter(Boolean).join('. ')}
        </p>
        <FileList
          items={items}
          rejected={rejected}
          onRetry={queue.retry}
          onRemove={queue.remove}
          onDismiss={(id) => setRejected((prev) => prev.filter((file) => file.id !== id))}
        />
      </div>
    </div>
  )
}

export default UploadPage
