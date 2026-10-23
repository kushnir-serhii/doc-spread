import type { ComponentProps } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import type { EditorTarget } from './editor-target'
import { SelectedEditor } from './selected-editor'

type FieldEditorPanelProps = Omit<ComponentProps<typeof SelectedEditor>, 'target'> & {
  /** null = nothing selected */
  target: EditorTarget | null
  onClose: () => void
  /** media query from which the editor sits beside the list instead of opening as a sheet */
  besideFrom?: string
}

const targetId = (target: EditorTarget) => (target.kind === 'field' ? target.field.id : target.column.id)

/** From lg up (or `besideFrom`) the editor sits beside the list; below it opens as a sheet. */
export const FieldEditorPanel = ({
  target,
  onClose,
  besideFrom = '(min-width: 1024px)',
  ...editorProps
}: FieldEditorPanelProps) => {
  const isDesktop = useMediaQuery(besideFrom)

  if (isDesktop) {
    return (
      <aside aria-label="Field editor" className="sticky top-4 self-start rounded-lg border bg-card p-5">
        {target ? (
          <SelectedEditor key={targetId(target)} target={target} {...editorProps} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Select a field to edit it.</p>
        )}
      </aside>
    )
  }

  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{target?.kind === 'column' ? 'Edit column' : 'Edit field'}</SheetTitle>
          <SheetDescription>Changes apply to the draft right away.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {target && <SelectedEditor key={targetId(target)} target={target} {...editorProps} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
