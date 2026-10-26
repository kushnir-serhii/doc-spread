import { LoaderCircle, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface RejectDialogProps {
  typeName: string
  disabled: boolean
  isPending: boolean
  errorMessage: string | null
  onReject: (reason: string) => void
  /** the dialog was opened: clears the last error */
  onOpen: () => void
}

/** Reject with a required reason: free text, or a quick pick that fills it. The trigger gets focus back on close. */
export const RejectDialog = ({ typeName, disabled, isPending, errorMessage, onReject, onOpen }: RejectDialogProps) => {
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const picks = ['Duplicate', `Not a ${typeName}`, 'Unreadable']
  const trimmed = reason.trim()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // closing while the request runs would hide its result
        if (isPending) return
        setOpen(next)
        if (next) onOpen()
        else setReason('')
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-touch flex-1 sm:flex-none" disabled={disabled}>
          <X aria-hidden="true" />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmed) onReject(trimmed)
          }}
        >
          <DialogHeader>
            <DialogTitle>Reject this document?</DialogTitle>
            <DialogDescription>The reason is kept with the document, and its values become read-only.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={fieldId}>Reason</Label>
            <Textarea
              id={fieldId}
              required
              value={reason}
              aria-invalid={errorMessage !== null}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {picks.map((pick) => (
                <Button
                  key={pick}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-touch md:min-h-8"
                  onClick={() => setReason(pick)}
                >
                  {pick}
                </Button>
              ))}
            </div>
          </div>
          {errorMessage && (
            <p role="alert" className="break-words text-sm text-destructive">
              Could not reject: {errorMessage}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-touch md:min-h-9"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" className="min-h-touch md:min-h-9" disabled={!trimmed || isPending}>
              {isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {isPending ? 'Rejecting…' : 'Reject document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
