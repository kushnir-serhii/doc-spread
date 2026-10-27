import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocuments } from '@/lib/api'
import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { Document, FieldAction, FieldDef } from '@/lib/mock/types'
import type { DocumentAction } from './action-form'
import { PreviewFrame } from './preview-frame'
import { PreviewResult } from './preview-result'
import { SlotSelect } from './slot-select'

interface PreviewDocumentsProps {
  typeId: string
  action: DocumentAction | null
  fields: FieldDef[]
  otherActions: FieldAction[]
  titleFieldId: string | null
}

const documentName = (document: Document, titleFieldId: string | null) => {
  const title = titleFieldId ? formatFieldValue(document.values[titleFieldId]) : '—'
  return title === '—' ? document.file.name : `${title} (${document.file.name})`
}

/** The documents of a saved type: pick one (newest by default) and see the action run on it. */
export const PreviewDocuments = ({ typeId, action, fields, otherActions, titleFieldId }: PreviewDocumentsProps) => {
  const selectId = useId()
  const [chosenId, setChosenId] = useState<string | null>(null)
  const query = useDocuments({ typeId })

  if (query.isPending) {
    return (
      <PreviewFrame>
        <Skeleton className="h-11 w-full md:h-9" />
        <Skeleton className="h-16 w-full" />
      </PreviewFrame>
    )
  }
  if (query.isError) {
    return (
      <PreviewFrame>
        <p role="alert" className="text-sm text-destructive">
          Couldn’t load the documents of this type.
        </p>
        <Button variant="outline" className="min-h-touch self-start md:min-h-9" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </PreviewFrame>
    )
  }

  const documents = query.data
    .filter((d) => Object.keys(d.values).length > 0)
    .toSorted((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  if (documents.length === 0) {
    return (
      <PreviewFrame>
        <p className="text-sm text-muted-foreground">
          This type has no documents with values yet. Upload one to see the action run on it.
        </p>
      </PreviewFrame>
    )
  }
  const document = documents.find((d) => d.id === chosenId) ?? documents[0]

  return (
    <PreviewFrame>
      <Label htmlFor={selectId}>Sample document</Label>
      <SlotSelect id={selectId} value={document.id} onChange={(event) => setChosenId(event.target.value)}>
        {documents.map((d) => (
          <option key={d.id} value={d.id}>
            {documentName(d, titleFieldId)}
          </option>
        ))}
      </SlotSelect>
      <div role="status" aria-live="polite">
        {action ? (
          <PreviewResult action={action} document={document} fields={fields} actions={[...otherActions, action]} />
        ) : (
          <p className="text-sm text-muted-foreground">Finish the action to see how it runs on this document.</p>
        )}
      </div>
    </PreviewFrame>
  )
}
