import { useId, type KeyboardEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SAMPLES_FULL_MESSAGE } from './use-samples'
import { SampleTab } from './sample-tab'

interface SampleTabsProps {
  ids: string[]
  /** null while there is no sample yet */
  activeId: string | null
  full: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

/** Samples 1–5 as tabs (arrow keys move between them), plus the "Add sample" control. */
export const SampleTabs = ({ ids, activeId, full, onSelect, onRemove, onAdd }: SampleTabsProps) => {
  const limitId = useId()

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    const edge = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : null
    if (step === 0 && edge === null) return
    event.preventDefault()
    const from = ids.indexOf(activeId ?? '')
    const next = ids[edge ?? (from + step + ids.length) % ids.length]
    onSelect(next)
    requestAnimationFrame(() => document.getElementById(`sample-tab-${next}`)?.focus())
  }

  return (
    <div className="mb-4 flex flex-wrap items-start gap-2">
      {ids.length === 0 ? (
        <p className="self-center text-sm text-muted-foreground">Add a sample document to test the type on.</p>
      ) : (
        <div role="tablist" aria-label="Samples" onKeyDown={handleKeyDown} className="flex min-w-0 flex-wrap gap-2">
          {ids.map((id, index) => (
            <SampleTab
              key={id}
              documentId={id}
              position={index + 1}
              active={id === activeId}
              canRemove={ids.length > 1}
              onSelect={() => onSelect(id)}
              onRemove={() => onRemove(id)}
            />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Button variant="outline" disabled={full} aria-describedby={full ? limitId : undefined} className="min-h-touch md:min-h-10" onClick={onAdd}>
          <Plus aria-hidden /> Add sample
        </Button>
        {full && (
          <p id={limitId} className="max-w-56 text-xs text-muted-foreground">
            {SAMPLES_FULL_MESSAGE}
          </p>
        )}
      </div>
    </div>
  )
}
