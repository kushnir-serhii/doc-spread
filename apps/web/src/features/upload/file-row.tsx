import { FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from './format-file-size'

interface FileRowProps {
  name: string
  size: number
  note?: string
  removeLabel: string
  onRemove: () => void
}

export const FileRow = ({ name, size, note, removeLabel, onRemove }: FileRowProps) => (
  <li className="flex items-center gap-3 px-3 py-2">
    <FileText aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium" title={name}>
        {name}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatFileSize(size)}
        {note ? ` · ${note}` : ''}
      </p>
    </div>
    <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={removeLabel} onClick={onRemove}>
      <X aria-hidden />
    </Button>
  </li>
)
