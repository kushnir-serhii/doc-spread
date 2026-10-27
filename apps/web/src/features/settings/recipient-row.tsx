import { Button } from '@/components/ui/button'
import type { Recipient } from '@/lib/mock/types'

interface RecipientRowProps {
  recipient: Recipient
  disabled: boolean
  onEdit: (recipient: Recipient) => void
  onRemove: (recipient: Recipient) => void
}

export const RecipientRow = ({ recipient, disabled, onEdit, onRemove }: RecipientRowProps) => (
  <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="truncate text-sm font-medium" title={recipient.name}>
        {recipient.name}
      </p>
      <p className="truncate text-sm text-muted-foreground" title={recipient.email}>
        {recipient.email}
      </p>
    </div>
    <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-label={`Remove ${recipient.name}`}
        onClick={() => onRemove(recipient)}
        className="min-h-touch md:min-h-9"
      >
        Remove
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-label={`Edit ${recipient.name}`}
        onClick={() => onEdit(recipient)}
        className="min-h-touch md:min-h-9"
      >
        Edit
      </Button>
    </div>
  </li>
)
