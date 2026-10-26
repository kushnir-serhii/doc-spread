import { Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { REVIEW_SHORTCUTS } from './review-shortcuts'

interface ReviewShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editable: boolean
}

/** The list of shortcuts, opened by "?" or by its button. Cmd stands in for Ctrl on a Mac. */
export const ReviewShortcutsDialog = ({ open, onOpenChange, editable }: ReviewShortcutsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        className="min-h-touch self-end"
        aria-label="Keyboard shortcuts"
        aria-keyshortcuts="?"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard aria-hidden="true" />
        <span className="hidden sm:inline">Shortcuts</span>
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Move between fields with J and K, then press Enter to edit. Letter keys don’t work while typing. On a Mac, Cmd
          replaces Ctrl.
        </DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        {REVIEW_SHORTCUTS.filter((shortcut) => editable || shortcut.readOnly).map((shortcut) => (
          <div key={shortcut.id} className="col-span-2 grid grid-cols-subgrid items-center">
            <dt className="flex items-center gap-1">
              {shortcut.keys.map((key, index) => (
                <span key={key} className="flex items-center gap-1">
                  {index > 0 && <span aria-hidden="true">+</span>}
                  <kbd className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-xs">{key}</kbd>
                </span>
              ))}
            </dt>
            <dd>{shortcut.description}</dd>
          </div>
        ))}
      </dl>
    </DialogContent>
  </Dialog>
)
