import type { DocumentType, FieldDef } from '@/lib/mock/types'

/** The fields summed per group: top-level money fields that are list columns, in list-column order. */
export const totalFields = ({ fields, listColumnIds }: Pick<DocumentType, 'fields' | 'listColumnIds'>): FieldDef[] =>
  listColumnIds.flatMap((id) => {
    const field = fields.find((candidate) => candidate.id === id)
    return field && field.type === 'money' ? [field] : []
  })
