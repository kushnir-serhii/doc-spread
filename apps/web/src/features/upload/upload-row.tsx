import { FileText, RotateCw, X } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatFileSize } from './format-file-size'
import type { FileState } from './file-state'
import { UploadProgress } from './upload-progress'
import type { UploadItem } from './use-file-states'

interface UploadRowProps {
  item: UploadItem
  onRetry: () => void
  onRemove: () => void
}

const linkClass = 'shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline'

const statusText = (state: FileState): string => {
  switch (state.kind) {
    case 'queued':
      return 'Waiting…'
    case 'uploading':
      return `Uploading ${Math.round(state.progress * 100)}%`
    case 'processing':
      return 'Processing…'
    case 'classified':
      return state.typeName
    case 'unclassified':
      return "Couldn't tell the type"
    case 'failed':
      return state.reason
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}

const RowProgress = ({ name, state }: { name: string; state: FileState }) => {
  if (state.kind === 'uploading') return <UploadProgress label={`Uploading ${name}`} value={state.progress} />
  if (state.kind === 'processing') return <UploadProgress label={`Processing ${name}`} />
  return null
}

const RowAction = ({ name, state, onRetry }: { name: string; state: FileState; onRetry: () => void }) => {
  switch (state.kind) {
    case 'classified':
      return (
        <Link to={`/documents/${state.documentId}`} className={linkClass}>
          Open<span className="sr-only"> {name}</span>
        </Link>
      )
    case 'unclassified':
      return (
        <Link to="/inbox?type=unclassified" className={linkClass}>
          Assign type<span className="sr-only"> for {name}</span>
        </Link>
      )
    case 'failed':
      return (
        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Retry ${name}`} onClick={onRetry}>
          <RotateCw aria-hidden />
        </Button>
      )
    case 'queued':
    case 'uploading':
    case 'processing':
      return null
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}

export const UploadRow = ({ item, onRetry, onRemove }: UploadRowProps) => {
  const { name, size } = item.file
  const { state } = item
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <FileText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex min-h-12 min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="truncate text-sm font-medium" title={name}>
          {name}
        </p>
        <p
          className={cn(
            'truncate text-xs tabular-nums text-muted-foreground',
            state.kind === 'failed' && 'text-danger-soft-foreground',
            state.kind === 'classified' && 'font-medium text-foreground',
          )}
          title={statusText(state)}
        >
          {formatFileSize(size)} · {statusText(state)}
        </p>
        <RowProgress name={name} state={state} />
      </div>
      <RowAction name={name} state={state} onRetry={onRetry} />
      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${name}`} onClick={onRemove}>
        <X aria-hidden />
      </Button>
    </li>
  )
}
