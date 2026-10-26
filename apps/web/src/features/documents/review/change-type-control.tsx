import { LoaderCircle } from 'lucide-react'
import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDocumentTypes, useReassignDocumentType } from '@/lib/api'
import type { Document } from '@/lib/mock/types'

interface ChangeTypeControlProps {
  doc: Document
}

/** Pick another type, confirm, and the document is extracted again with it. */
export const ChangeTypeControl = ({ doc }: ChangeTypeControlProps) => {
  const labelId = useId()
  const types = useDocumentTypes().data ?? []
  const reassign = useReassignDocumentType()
  const [targetId, setTargetId] = useState<string | null>(null)
  const options = types.filter((type) => type.id !== doc.typeId)
  const target = options.find((type) => type.id === targetId)
  if (options.length === 0) return null

  const close = () => {
    setTargetId(null)
    reassign.reset()
  }

  return (
    <div className="flex items-center gap-2">
      <Label id={labelId} className="text-sm text-muted-foreground">
        Change type
      </Label>
      {/* controlled to '' so the same type can be picked again after Cancel */}
      <Select value="" onValueChange={setTargetId}>
        <SelectTrigger aria-labelledby={labelId} className="min-h-touch w-48 md:min-h-9">
          <SelectValue placeholder="Choose a type" />
        </SelectTrigger>
        <SelectContent>
          {options.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AlertDialog open={target !== undefined} onOpenChange={(open) => !open && !reassign.isPending && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the type to {target?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current values and your unsaved edits will be replaced by a new extraction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reassign.isError && (
            <p role="alert" className="break-words text-sm text-destructive">
              Could not change the type: {reassign.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-touch md:min-h-9" disabled={reassign.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              className="min-h-touch md:min-h-9"
              disabled={reassign.isPending || !target}
              onClick={() => target && reassign.mutate({ id: doc.id, typeId: target.id }, { onSuccess: close })}
            >
              {reassign.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {reassign.isPending ? 'Changing…' : 'Change type'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
