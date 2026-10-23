import type { ColumnDef, CreateDocumentTypeInput, DocumentType, FieldDef } from '@/lib/mock/types'
import type { DocumentTemplate } from '@/lib/mock/templates'

/** An unsaved document type. Slice 6 passes it to `useCreateDocumentType()`. */
export type TypeDraft = CreateDocumentTypeInput

export const blankDraft = (): TypeDraft => ({
  name: '',
  description: '',
  fields: [],
  titleFieldId: null,
  listColumnIds: [],
})

/** Copies a template with fresh field ids; keys stay, title and list columns follow the new ids. */
export const draftFromTemplate = (template: DocumentTemplate): TypeDraft => {
  const idMap = new Map<string, string>()
  const fresh = (oldId: string) => {
    const id = crypto.randomUUID()
    idMap.set(oldId, id)
    return id
  }

  const fields = template.fields.map((field): FieldDef => {
    const columns = field.columns?.map((column): ColumnDef => ({ ...column, id: fresh(column.id) }))
    return { ...field, id: fresh(field.id), ...(columns && { columns }) }
  })

  return {
    name: template.name,
    description: template.description,
    fields,
    titleFieldId: template.titleFieldId === null ? null : (idMap.get(template.titleFieldId) ?? null),
    listColumnIds: template.listColumnIds.flatMap((id) => idMap.get(id) ?? []),
  }
}

/** A saved type as an editable draft. Keeps the ids: saving must not break existing documents. */
export const draftFromType = (type: DocumentType): TypeDraft => ({
  name: type.name,
  description: type.description,
  fields: type.fields,
  titleFieldId: type.titleFieldId,
  listColumnIds: type.listColumnIds,
})
