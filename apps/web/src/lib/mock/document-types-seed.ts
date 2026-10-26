// Seed document types, built from the server-provided templates. Not part of the public mock API.
import { mapActionIds } from '@/lib/fields/action-ids'
import { DOCUMENT_TEMPLATES } from './templates'
import type { DocumentType, FieldDef } from './types'

const typeScoped = (id: string) => id.replace(/^tpl-/, 'type-')

const fromTemplate = (
  templateId: string,
  version: number,
  updatedAt: string,
  extraFields: FieldDef[] = [],
): DocumentType => {
  const template = DOCUMENT_TEMPLATES.find((t) => t.id === templateId)
  if (!template) throw new Error(`Unknown template ${templateId}`)
  const fields = template.fields.map(
    (field): FieldDef => ({
      ...field,
      id: typeScoped(field.id),
      ...(field.columns && { columns: field.columns.map((c) => ({ ...c, id: typeScoped(c.id) })) }),
    }),
  )
  // extra fields go right after the invoice number
  fields.splice(fields.findIndex((f) => f.key === 'invoice_number') + 1, 0, ...extraFields)
  return {
    ...template,
    id: typeScoped(template.id),
    version,
    updatedAt,
    fields,
    actions: template.actions.map((action) => mapActionIds(action, typeScoped)),
    titleFieldId: template.titleFieldId && typeScoped(template.titleFieldId),
    listColumnIds: template.listColumnIds.map(typeScoped),
  }
}

/** Added to Invoice in version 2; version 1 documents don't have it. */
const ORDER_NUMBER_FIELD: FieldDef = {
  id: 'type-invoice-f-order-number',
  key: 'order_number',
  label: 'Order number',
  type: 'text',
  required: false,
  hint: 'Purchase order number the invoice refers to, usually labelled "Nr zamówienia". Leave empty if absent.',
  examples: [],
}

/** Every version of every type; old versions stay readable. */
export const seedDocumentTypeVersions: DocumentType[] = [
  fromTemplate('tpl-invoice', 1, '2026-08-12T10:00:00.000Z'),
  fromTemplate('tpl-invoice', 2, '2026-10-02T08:30:00.000Z', [ORDER_NUMBER_FIELD]),
  fromTemplate('tpl-receipt', 1, '2026-08-12T10:05:00.000Z'),
  fromTemplate('tpl-contract', 1, '2026-08-12T10:10:00.000Z'),
]

/** The current version of each type. */
export const seedDocumentTypes: DocumentType[] = seedDocumentTypeVersions.filter(
  (t) => !seedDocumentTypeVersions.some((other) => other.id === t.id && other.version > t.version),
)
