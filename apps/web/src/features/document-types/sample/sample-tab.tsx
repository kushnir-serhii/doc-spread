import { TriangleAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocument } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useUnreadableSample } from './use-sample-readability'

interface SampleTabProps {
  documentId: string
  position: number
  active: boolean
  canRemove: boolean
  onSelect: () => void
  onRemove: () => void
}

/** One sample: the tab (name + file name) and, beside it, the remove button (not inside the tab: buttons can't nest). */
export const SampleTab = ({ documentId, position, active, canRemove, onSelect, onRemove }: SampleTabProps) => {
  const fileName = useDocument(documentId).data?.file.name
  const unreadable = useUnreadableSample(documentId)

  return (
    <div className={cn('flex min-w-0 max-w-56 items-center rounded-md border', active ? 'border-primary bg-primary-soft' : 'bg-card')}>
      <button
        type="button"
        role="tab"
        id={`sample-tab-${documentId}`}
        aria-selected={active}
        tabIndex={active ? 0 : -1}
        data-sample-tab
        title={fileName}
        onClick={onSelect}
        className="flex min-h-touch min-w-0 flex-1 flex-col justify-center rounded-md px-3 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-10"
      >
        <span className="flex items-center gap-1 text-sm font-medium">
          Sample {position}
          {unreadable && (
            <>
              <TriangleAlert className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="sr-only">(can’t be read in this demo)</span>
            </>
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">{fileName ?? 'Loading…'}</span>
      </button>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="size-touch shrink-0 md:size-9"
          aria-label={`Remove sample ${position}${fileName ? ` (${fileName})` : ''}`}
          onClick={onRemove}
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  )
}
