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
import type { ValidationIssue } from '@/lib/fields/validate-field-value'

interface ReviewWarningsDialogProps {
  open: boolean
  warnings: ValidationIssue[]
  onConfirm: () => void
  onCancel: () => void
}

/** Approve with warnings: lists them; Confirm approves, Cancel goes back to the form. */
export const ReviewWarningsDialog = ({ open, warnings, onConfirm, onCancel }: ReviewWarningsDialogProps) => (
  <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Approve with {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}?
        </AlertDialogTitle>
        <AlertDialogDescription>These checks didn’t pass. You can approve anyway.</AlertDialogDescription>
      </AlertDialogHeader>
      <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto text-sm">
        {warnings.map((warning) => (
          <li key={`${warning.fieldId}:${warning.label}`}>
            <span className="font-medium">{warning.label}</span>:{' '}
            <span className="break-words tabular-nums">{warning.reason}</span>
          </li>
        ))}
      </ul>
      <AlertDialogFooter>
        <AlertDialogCancel className="min-h-touch md:min-h-9">Cancel</AlertDialogCancel>
        <AlertDialogAction className="min-h-touch md:min-h-9" onClick={onConfirm}>
          Approve anyway
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
