import type { AnyExtractedValue, CurrencyCode, Document, DocumentType } from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Checks a document's values against the type version it was extracted with.
 * The types can't tie a value to its field id, so this runs over the mock seeds.
 * Returns human-readable problems; an empty array means the document is consistent.
 */
export const findValueMismatches = (doc: Document, type: DocumentType | undefined): string[] => {
  const problems: string[] = []
  const report = (message: string) => problems.push(`${doc.id}: ${message}`)

  if (doc.typeId === null) {
    if (doc.typeVersion !== null) report('typeVersion set without a type')
    if (Object.keys(doc.values).length > 0) report('has values but no type')
    return problems
  }
  if (!type) {
    report(`type ${doc.typeId} v${doc.typeVersion} not found`)
    return problems
  }
  if (type.id !== doc.typeId || type.version !== doc.typeVersion) {
    report(`checked against ${type.id} v${type.version}, expected ${doc.typeId} v${doc.typeVersion}`)
  }

  const currencies = new Set<CurrencyCode>()
  const checkScalar = (where: string, value: AnyExtractedValue, options?: string[]) => {
    if (value.confidence < 0 || value.confidence > 1) report(`${where}: confidence out of range`)
    switch (value.type) {
      case 'money':
        if (value.value) {
          if (!Number.isInteger(value.value.amount)) report(`${where}: money amount is not an integer`)
          currencies.add(value.value.currency)
        }
        break
      case 'select':
        if (value.value !== null && !options?.includes(value.value)) {
          report(`${where}: "${value.value}" is not one of the options`)
        }
        break
      case 'date':
        if (value.value !== null && !ISO_DATE.test(value.value)) {
          report(`${where}: "${value.value}" is not an ISO date`)
        }
        break
      default:
        break
    }
  }

  for (const [fieldId, value] of Object.entries(doc.values)) {
    const field = type.fields.find((f) => f.id === fieldId)
    if (!field) {
      report(`"${fieldId}" is not a field of ${type.id} v${type.version}`)
      continue
    }
    if (field.type !== value.type) {
      report(`${field.key}: value type ${value.type} but field type ${field.type}`)
      continue
    }
    if (value.type !== 'table') {
      checkScalar(field.key, value, field.options)
      continue
    }
    const rowIds = new Set<string>()
    for (const row of value.rows) {
      if (rowIds.has(row.id)) report(`${field.key}: duplicate row id ${row.id}`)
      rowIds.add(row.id)
      for (const [columnId, cell] of Object.entries(row.cells)) {
        const column = field.columns?.find((c) => c.id === columnId)
        const where = `${field.key}[${row.id}]`
        if (!column) {
          report(`${where}: "${columnId}" is not a column of ${field.key}`)
        } else if (column.type !== cell.type) {
          report(`${where}.${column.key}: cell type ${cell.type} but column type ${column.type}`)
        } else {
          checkScalar(`${where}.${column.key}`, cell, column.options)
        }
      }
    }
  }

  if (currencies.size > 1) report(`mixed currencies: ${[...currencies].join(', ')}`)
  return problems
}
