import { useId } from 'react'
import { Check, Pencil, RotateCcw, X } from 'lucide-react'
import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { FieldValue } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { confidenceOf } from './proposal-highlights'
import type { ProposalItem } from './use-proposal-review'

interface ProposalRowProps {
  item: ProposalItem
  /** From the test extraction; undefined until it arrives. */
  value: FieldValue | undefined
  valueLoading: boolean
  selected: boolean
  onActivate: (id: string | null) => void
  onSelect: (id: string) => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRestore: (id: string) => void
  onRename: (id: string, label: string) => void
  /** 1-based position, for distinct names */
  position: number
}

const BUTTON = 'min-h-touch md:min-h-9'

export const ProposalRow = ({
  item,
  value,
  valueLoading,
  selected,
  onActivate,
  onSelect,
  onAccept,
  onReject,
  onRestore,
  onRename,
  position,
}: ProposalRowProps) => {
  const inputId = useId()
  const { field, status } = item
  const confidence = confidenceOf(value)
  const text = formatFieldValue(value)
  const name = field.label.trim() || 'this field'

  return (
    <li
      data-proposal-id={field.id}
      aria-current={selected || undefined}
      onPointerEnter={() => onActivate(field.id)}
      onPointerLeave={() => onActivate(null)}
      onFocus={() => onActivate(field.id)}
      className={cn('flex flex-col gap-2 p-3', selected && 'bg-accent', status === 'rejected' && 'opacity-70')}
    >
      <Label htmlFor={inputId} className="sr-only">
        Name of field {position}
      </Label>
      <Input
        id={inputId}
        value={field.label}
        onChange={(event) => onRename(field.id, event.target.value)}
        className={cn('min-h-touch font-medium md:min-h-9', status === 'rejected' && 'line-through')}
      />
      {status !== 'rejected' && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {valueLoading ? (
            <Skeleton className="h-5 w-28" />
          ) : (
            <span className="amount min-w-0 truncate text-sm" title={text}>
              {text}
            </span>
          )}
          {confidence !== undefined && <ConfidenceBadge score={confidence} />}
          {field.examples.length === 0 && <span className="text-xs text-muted-foreground">No box on the document</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {status === 'proposed' && (
          <>
            <Button size="sm" className={BUTTON} aria-label={`Accept ${name}`} onClick={() => onAccept(field.id)}>
              <Check aria-hidden /> Accept
            </Button>
            <Button size="sm" variant="outline" className={BUTTON} aria-label={`Reject ${name}`} onClick={() => onReject(field.id)}>
              <X aria-hidden /> Reject
            </Button>
          </>
        )}
        {status === 'accepted' && (
          <>
            <span className="inline-flex items-center gap-1 text-sm font-medium">
              <Check className="size-4" aria-hidden /> Accepted
            </span>
            <Button size="sm" variant="outline" className={BUTTON} aria-pressed={selected} aria-label={`Edit ${name}`} onClick={() => onSelect(field.id)}>
              <Pencil aria-hidden /> Edit
            </Button>
            <Button size="sm" variant="ghost" className={BUTTON} aria-label={`Reject ${name}`} onClick={() => onReject(field.id)}>
              <X aria-hidden /> Reject
            </Button>
          </>
        )}
        {status === 'rejected' && (
          <>
            <span className="text-sm text-muted-foreground">Rejected</span>
            <Button size="sm" variant="outline" className={BUTTON} aria-label={`Restore ${name}`} onClick={() => onRestore(field.id)}>
              <RotateCcw aria-hidden /> Restore
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
