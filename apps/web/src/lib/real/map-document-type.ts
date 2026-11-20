import type { DocumentType, ExportColumnMapping, ExportMapping, FieldAction, FieldDef } from '@/lib/mock/types'

/** A `document_types` row as selected by `document-types.ts`. */
export interface TypeRow {
  id: string
  name: string
  description: string
  current_version: number
  export_mapping: unknown
  updated_at: string
}

/** A `document_type_versions` row as selected by `document-types.ts`. */
export interface VersionRow {
  type_id: string
  version: number
  fields: unknown
  actions: unknown
  title_field_id: string | null
  list_column_ids: unknown
  created_at: string
}

export const TYPE_COLUMNS = 'id, name, description, current_version, export_mapping, updated_at'
export const VERSION_COLUMNS = 'type_id, version, fields, actions, title_field_id, list_column_ids, created_at'

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** One type at one version. The jsonb columns are written by the app in the `FieldDef[]` / `FieldAction[]` shape. */
export const toDocumentType = (type: TypeRow, version: VersionRow): DocumentType => ({
  id: type.id,
  name: type.name,
  description: type.description,
  version: version.version,
  fields: Array.isArray(version.fields) ? (version.fields as FieldDef[]) : [], // jsonb written by the app in this shape
  actions: Array.isArray(version.actions) ? (version.actions as FieldAction[]) : [], // jsonb written by the app in this shape
  titleFieldId: version.title_field_id,
  listColumnIds: Array.isArray(version.list_column_ids)
    ? version.list_column_ids.filter((id): id is string => typeof id === 'string')
    : [],
  updatedAt: version.created_at,
})

/** The mapping saved on the type row, or null when none was saved. */
export const toExportMapping = (type: Pick<TypeRow, 'id' | 'export_mapping' | 'updated_at'>): ExportMapping | null => {
  const saved = type.export_mapping
  if (!isObject(saved) || !Array.isArray(saved.columns)) return null
  return { ...(saved as unknown as ExportColumnMapping), typeId: type.id, updatedAt: type.updated_at } // jsonb written by the app in this shape
}
