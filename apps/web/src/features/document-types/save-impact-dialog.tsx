import { useId, useState } from 'react'
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
import { describeAdded, describeRemoved, type TypeImpact } from './type-impact'

interface SaveImpactDialogProps {
  impact: TypeImpact
  /** null = not known */
  documentCount: number | null
  nextVersion: number
  onConfirm: (reextract: boolean) => void
  onCancel: () => void
}

/** Mount it when Save needs a decision; it opens at once. Added fields can be re-extracted (default: no). */
export const SaveImpactDialog = ({ impact, documentCount, nextVersion, onConfirm, onCancel }: SaveImpactDialogProps) => {
  const checkboxId = useId()
  const [reextract, setReextract] = useState(false)

  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save as version {nextVersion}?</AlertDialogTitle>
          <AlertDialogDescription>
            Existing documents keep the version they were read with.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          {impact.added > 0 && <p>{describeAdded(impact.added, documentCount)}</p>}
          {impact.added > 0 && (
            <label htmlFor={checkboxId} className="flex min-h-touch items-center gap-3 font-medium md:min-h-9">
              <input
                id={checkboxId}
                type="checkbox"
                checked={reextract}
                onChange={(event) => setReextract(event.target.checked)}
                className="size-5 shrink-0 accent-primary"
              />
              Re-extract them for existing documents
            </label>
          )}
          {impact.removed > 0 && <p>{describeRemoved(impact.removed)}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-touch md:min-h-9">Cancel</AlertDialogCancel>
          <AlertDialogAction className="min-h-touch md:min-h-9" onClick={() => onConfirm(reextract)}>
            Save version {nextVersion}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
