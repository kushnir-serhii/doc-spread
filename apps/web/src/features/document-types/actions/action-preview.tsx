import type { FieldAction, FieldDef } from '@/lib/mock/types'
import { PreviewDocuments } from './preview-documents'
import { PreviewFrame } from './preview-frame'

interface ActionPreviewProps {
  /** null = the action isn't finished */
  action: FieldAction | null
  fields: FieldDef[]
  /** the draft's actions without the one being edited */
  otherActions: FieldAction[]
  titleFieldId: string | null
  /** undefined = the type isn't saved yet, so it has no documents */
  typeId: string | undefined
}

/** Evaluates the action live on a sample document of the type. */
export const ActionPreview = ({ typeId, ...rest }: ActionPreviewProps) =>
  typeId === undefined ? (
    <PreviewFrame>
      <p className="text-sm text-muted-foreground">
        The preview works once the type is saved and has documents. Save the type, upload a document, then come back.
      </p>
    </PreviewFrame>
  ) : (
    <PreviewDocuments typeId={typeId} {...rest} />
  )
