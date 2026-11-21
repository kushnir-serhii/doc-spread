import type {
  CreateDocumentTypeInput,
  DocumentType,
  ExportColumnMapping,
  ExportMapping,
  UpdateDocumentTypeInput,
} from '@/lib/mock/types'
import { getSupabase } from './client'
import { getCompanyId } from './company-id'
import { toDocumentType, toExportMapping, TYPE_COLUMNS, VERSION_COLUMNS } from './map-document-type'
import type { TypeRow, VersionRow } from './map-document-type'

// Same rules as the mock, so the builder gets the same errors with either backend.
const assertTypeShape = (type: Pick<DocumentType, 'fields' | 'titleFieldId' | 'listColumnIds'>): void => {
  const keys = new Set<string>()
  for (const field of type.fields) {
    if (keys.has(field.key)) throw new Error(`Duplicate field key: ${field.key}`)
    keys.add(field.key)
    const columnKeys = new Set<string>()
    for (const column of field.columns ?? []) {
      if (columnKeys.has(column.key)) throw new Error(`Duplicate column key in ${field.key}: ${column.key}`)
      columnKeys.add(column.key)
    }
  }
  const ids = new Set(type.fields.map((f) => f.id))
  if (type.titleFieldId !== null && !ids.has(type.titleFieldId)) {
    throw new Error(`Title field not found: ${type.titleFieldId}`)
  }
  for (const id of type.listColumnIds) {
    if (!ids.has(id)) throw new Error(`List column not found: ${id}`)
  }
}

const notFound = (id: string, version?: number): Error =>
  new Error(`Document type not found: ${id}${version === undefined ? '' : ` v${version}`}`)

/** Every type of the caller's company (RLS) with its current version, by name. */
export const listDocumentTypes = async (): Promise<DocumentType[]> => {
  const supabase = getSupabase()
  const { data: types, error } = await supabase.from('document_types').select(TYPE_COLUMNS).order('name', { ascending: true })
  if (error) throw new Error(`Couldn't load the document types: ${error.message}`)
  if (types.length === 0) return []
  // one request for the current version of every type (ids and versions come from the database)
  const filter = types.map((type) => `and(type_id.eq.${type.id},version.eq.${type.current_version})`).join(',')
  const { data: versions, error: versionsError } = await supabase.from('document_type_versions').select(VERSION_COLUMNS).or(filter)
  if (versionsError) throw new Error(`Couldn't load the document types: ${versionsError.message}`)
  return (types as TypeRow[]).flatMap((type) => {
    const version = (versions as VersionRow[]).find((v) => v.type_id === type.id && v.version === type.current_version)
    return version ? [toDocumentType(type, version)] : []
  })
}

/** One type at `version`, or at its current version. Earlier versions stay readable. */
export const getDocumentType = async (id: string, version?: number): Promise<DocumentType> => {
  const supabase = getSupabase()
  const { data: type, error } = await supabase.from('document_types').select(TYPE_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new Error(`Couldn't load the document type: ${error.message}`)
  if (!type) throw notFound(id, version)
  const wanted = version ?? type.current_version
  const { data: row, error: versionError } = await supabase
    .from('document_type_versions')
    .select(VERSION_COLUMNS)
    .eq('type_id', id)
    .eq('version', wanted)
    .maybeSingle()
  if (versionError) throw new Error(`Couldn't load the document type: ${versionError.message}`)
  if (!row) throw notFound(id, version)
  return toDocumentType(type as TypeRow, row as VersionRow)
}

/** Inserts the type row and its version 1; if the version fails the type row is removed again. */
export const createDocumentType = async (input: CreateDocumentTypeInput): Promise<DocumentType> => {
  assertTypeShape(input)
  const supabase = getSupabase()
  const companyId = await getCompanyId()
  const { data: type, error } = await supabase
    .from('document_types')
    .insert({ company_id: companyId, name: input.name, description: input.description, current_version: 1 })
    .select(TYPE_COLUMNS)
    .single()
  if (error) throw new Error(`Couldn't save the document type: ${error.message}`)
  const { data: version, error: versionError } = await supabase
    .from('document_type_versions')
    .insert({
      type_id: type.id,
      version: 1,
      company_id: companyId,
      fields: input.fields,
      actions: input.actions,
      title_field_id: input.titleFieldId,
      list_column_ids: input.listColumnIds,
    })
    .select(VERSION_COLUMNS)
    .single()
  if (versionError) {
    await supabase.from('document_types').delete().eq('id', type.id)
    throw new Error(`Couldn't save the document type: ${versionError.message}`)
  }
  return toDocumentType(type as TypeRow, version as VersionRow)
}

/** All or nothing: every input is validated first, and the types created so far are removed if one fails. */
export const createDocumentTypes = async (inputs: CreateDocumentTypeInput[]): Promise<DocumentType[]> => {
  inputs.forEach((input) => assertTypeShape(input))
  const created: DocumentType[] = []
  try {
    for (const input of inputs) created.push(await createDocumentType(input))
  } catch (error) {
    if (created.length > 0) {
      await getSupabase()
        .from('document_types')
        .delete()
        .in('id', created.map((t) => t.id))
    }
    throw error
  }
  return created
}

/**
 * Saves a new version (`current_version + 1`); the previous one stays readable and locked.
 * `current_version` is bumped first with a check on the old value, so two saves at once can't both win.
 */
export const updateDocumentType = async (id: string, patch: UpdateDocumentTypeInput): Promise<DocumentType> => {
  const supabase = getSupabase()
  const current = await getDocumentType(id)
  const next: DocumentType = { ...current, ...patch, id, version: current.version + 1 }
  assertTypeShape(next)
  const { data: bumped, error } = await supabase
    .from('document_types')
    .update({
      name: next.name,
      description: next.description,
      current_version: next.version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('current_version', current.version)
    .select(TYPE_COLUMNS)
  if (error) throw new Error(`Couldn't save the document type: ${error.message}`)
  if (bumped.length === 0) throw new Error('This type was changed elsewhere. Reload it and try again.')
  const { data: version, error: versionError } = await supabase
    .from('document_type_versions')
    .insert({
      type_id: id,
      version: next.version,
      company_id: await getCompanyId(),
      fields: next.fields,
      actions: next.actions,
      title_field_id: next.titleFieldId,
      list_column_ids: next.listColumnIds,
    })
    .select(VERSION_COLUMNS)
    .single()
  if (versionError) {
    // put the old version back so the type doesn't point at a version that doesn't exist
    await supabase
      .from('document_types')
      .update({ name: current.name, description: current.description, current_version: current.version })
      .eq('id', id)
    throw new Error(`Couldn't save the document type: ${versionError.message}`)
  }
  return toDocumentType(bumped[0] as TypeRow, version as VersionRow)
}

/** The mapping saved for a type (shared by the team, not versioned), or null. */
export const getExportMapping = async (typeId: string): Promise<ExportMapping | null> => {
  const { data, error } = await getSupabase()
    .from('document_types')
    .select('id, export_mapping, updated_at')
    .eq('id', typeId)
    .maybeSingle()
  if (error) throw new Error(`Couldn't load the export mapping: ${error.message}`)
  if (!data) throw notFound(typeId)
  return toExportMapping(data)
}

export const saveExportMapping = async (typeId: string, mapping: ExportColumnMapping): Promise<ExportMapping> => {
  const { data, error } = await getSupabase()
    .from('document_types')
    .update({ export_mapping: mapping })
    .eq('id', typeId)
    .select('id, export_mapping, updated_at')
  if (error) throw new Error(`Couldn't save the export mapping: ${error.message}`)
  const saved = data[0] ? toExportMapping(data[0]) : null
  if (!saved) throw notFound(typeId)
  return saved
}
