import type { ComponentProps } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { FieldEditor } from './field-editor'

type FieldEditorPanelProps = Omit<ComponentProps<typeof FieldEditor>, 'field'> & {
  /** null = nothing selected */
  field: ComponentProps<typeof FieldEditor>['field'] | null
  onClose: () => void
}

/** From lg up the editor sits beside the list; below it opens as a sheet. */
export const FieldEditorPanel = ({ field, onClose, ...editorProps }: FieldEditorPanelProps) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (isDesktop) {
    return (
      <aside aria-label="Field editor" className="sticky top-4 self-start rounded-lg border bg-card p-5">
        {field ? (
          <FieldEditor key={field.id} field={field} {...editorProps} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Select a field to edit it.</p>
        )}
      </aside>
    )
  }

  return (
    <Sheet open={field !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit field</SheetTitle>
          <SheetDescription>Changes apply to the draft right away.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {field && <FieldEditor key={field.id} field={field} {...editorProps} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
