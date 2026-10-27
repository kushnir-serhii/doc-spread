import { LoaderCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Recipient } from '@/lib/mock/types'

interface RemoveRecipientDialogProps {
  /** the recipient to remove; the dialog is open while it is set */
  recipient: Recipient | null
  pending: boolean
  onConfirm: (recipient: Recipient) => void
  onCancel: () => void
}

export const RemoveRecipientDialog = ({ recipient, pending, onConfirm, onCancel }: RemoveRecipientDialogProps) => (
  <AlertDialog open={recipient !== null} onOpenChange={(open) => !open && !pending && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove recipient?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">
          {recipient?.name} ({recipient?.email}) will no longer be offered as a choice in Export. Past exports are not
          affected.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending} className="min-h-touch md:min-h-9">
          Keep
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={pending}
          className="min-h-touch md:min-h-9"
          onClick={(event) => {
            // stay open while saving; the parent closes it on success
            event.preventDefault()
            if (recipient) onConfirm(recipient)
          }}
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? 'Removing…' : 'Remove'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
