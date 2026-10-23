import { formatFieldValue } from '@/lib/fields/format-field-value'
import type { Document, DocumentType } from '@/lib/mock/types'

export const documentTitle = (doc: Document, type: DocumentType | undefined): string => {
  if (type?.titleFieldId) {
    const title = formatFieldValue(doc.values[type.titleFieldId])
    if (title !== '—') return title
  }
  return doc.file.name
}
