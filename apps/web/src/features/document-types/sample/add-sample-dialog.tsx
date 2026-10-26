import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AddSampleBody, type AddSampleView } from './add-sample-body'

interface AddSampleDialogProps {
  open: boolean
  initialView: AddSampleView
  takenIds: string[]
  onOpenChange: (open: boolean) => void
  onAdd: (documentId: string) => void
}

export const AddSampleDialog = ({ open, initialView, takenIds, onOpenChange, onAdd }: AddSampleDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add a sample</DialogTitle>
        <DialogDescription>The type is tried on it right away; nothing is saved until you press Save.</DialogDescription>
      </DialogHeader>
      <AddSampleBody initialView={initialView} takenIds={takenIds} onAdd={onAdd} />
    </DialogContent>
  </Dialog>
)
