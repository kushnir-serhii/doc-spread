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

/** `keyTouched`: ids of fields and columns whose key is the user's own; the others follow the label. */
export interface BuilderState {
  draft: TypeDraft
  keyTouched: string[]
}

export type FieldPatch = Partial<Pick<FieldDef, 'required' | 'hint' | 'options'>>

/** Swaps an item with its neighbour; returns the same array at either end. */
export const moveItem = <T extends { id: string }>(items: T[], id: string, direction: 'up' | 'down') => {
  const from = items.findIndex((item) => item.id === id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
