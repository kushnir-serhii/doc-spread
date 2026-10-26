export type Confidence = 'high' | 'medium' | 'low'

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/** Amount in minor units (grosze/cents) — always an integer. */
export interface Money {
  amount: number
  currency: CurrencyCode
}

export type FileType = 'pdf' | 'jpg' | 'png'

export interface Company {
  name: string
  taxId: string
  accountantEmail: string
  defaultCurrency: CurrencyCode
}

export type TeamRole = 'owner' | 'admin' | 'member'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf_bundle'
export type ExportDestination = 'download' | 'email'
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface ExportJob {
  id: string
  createdAt: string
  format: ExportFormat
  typeId: string
  documentIds: string[]
  destination: ExportDestination
  recipient?: string
  status: ExportStatus
}

export interface CreateExportJobInput {
  format: ExportFormat
  typeId: string
  documentIds: string[]
  destination: ExportDestination
  recipient?: string
}

export const FIELD_TYPES = [
  'text',
  'number',
  'money',
  'date',
  'boolean',
  'select',
  'email',
  'phone',
  'tax_id',
  'table',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]
export type ScalarFieldType = Exclude<FieldType, 'table'>

/** Normalized to the page after rotation: 0..1, origin top-left. */
export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface FieldExample {
  documentId: string
  page: number
  bbox: BBox
  text: string
  /** nearby label, e.g. "Data wystawienia:" */
  anchorText?: string
}

export interface FieldDef {
  /** stable; never changes on rename */
  id: string
  /** export key, unique per type: "issue_date" */
  key: string
  label: string
  type: FieldType
  required: boolean
  /** instruction for the AI */
  hint?: string
  /** type === 'select' */
  options?: string[]
  /** type === 'table'; one level only, no nested tables */
  columns?: ColumnDef[]
  /** can be used for grouping (spec 010) */
  groupable?: boolean
  examples: FieldExample[]
}

/** A table column: a field that is never a table itself. */
export type ColumnDef = Omit<FieldDef, 'type' | 'columns'> & {
  type: ScalarFieldType
}

export interface DocumentType {
  id: string
  name: string
  /** what these documents are; also given to the AI for classification */
  description: string
  version: number
  fields: FieldDef[]
  titleFieldId: string | null
  listColumnIds: string[]
  updatedAt: string
}

export const DOCUMENT_STATUSES = [
  'uploaded',
  'processing',
  'unclassified',
  'needs_review',
  'approved',
  'exported',
  'rejected',
  'error',
] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export interface FieldValueMap {
  text: string
  number: number
  money: Money
  date: string
  boolean: boolean
  select: string
  email: string
  phone: string
  tax_id: string
}

export interface ExtractedValue<T extends ScalarFieldType = ScalarFieldType> {
  type: T
  value: FieldValueMap[T] | null
  /** 0..1; 1 once a person has edited or confirmed it */
  confidence: number
  source?: { page: number; bbox: BBox }
}

/** Discriminated on `type`: narrowing gives the matching `value`. */
export type AnyExtractedValue = {
  [K in ScalarFieldType]: ExtractedValue<K>
}[ScalarFieldType]

export interface TableValue {
  type: 'table'
  rows: { id: string; cells: Record<string, AnyExtractedValue> }[]
}

export type FieldValue = AnyExtractedValue | TableValue

export interface Token {
  id: string
  text: string
  bbox: BBox
}

export interface DocumentPage {
  index: number
  width: number
  height: number
  imageUrl?: string
  tokens: Token[]
}

export interface Document {
  id: string
  file: { name: string; type: FileType; pageCount: number; url: string }
  uploadedAt: string
  status: DocumentStatus
  typeId: string | null
  typeVersion: number | null
  classification: { confidence: number } | null
  values: Record<string, FieldValue>
  overallConfidence: number
  errorMessage?: string
  rejectionReason?: string
}

export interface ListDocumentsParams {
  typeId?: string
  status?: DocumentStatus
  /** file name and any text-like value, case-insensitive */
  search?: string
  /** documents whose value for the field equals `value` (trimmed, case-insensitive) */
  group?: { fieldId: string; value: string }
}

/** To start from a template, copy its fields from listTemplates into `fields`. */
export type CreateDocumentTypeInput = Pick<
  DocumentType,
  'name' | 'description' | 'fields' | 'titleFieldId' | 'listColumnIds'
>

/** Changing any of these raises the type's version. */
export type UpdateDocumentTypeInput = Partial<CreateDocumentTypeInput>

export interface GroupValue {
  /** display form of the first occurrence */
  value: string
  count: number
  /** ISO datetime of the newest document in the group */
  lastDocumentAt: string
}

export interface SuggestFieldInput {
  documentId: string
  page: number
  bbox: BBox
  text: string
}

/** A guess for a field from a pointed-at selection; `example` is the selection itself. */
export interface FieldSuggestion {
  label: string
  key: string
  type: ScalarFieldType
  hint: string
  example: FieldExample
}

export interface TestExtractInput {
  fields: FieldDef[]
  documentId: string
}
