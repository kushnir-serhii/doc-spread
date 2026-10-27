export type Confidence = 'high' | 'medium' | 'low'

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'JPY'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/** Amount in the currency's minor unit (cents, or yen for JPY) — always an integer. */
export interface Money {
  amount: number
  currency: CurrencyCode
}

export type FileType = 'pdf' | 'jpg' | 'png'

/** A saved export recipient (edited in Settings, spec 011). */
export interface Recipient {
  id: string
  name: string
  email: string
}

export interface Company {
  name: string
  taxId: string
  recipients: Recipient[]
  defaultCurrency: CurrencyCode
  /** BCP 47 tag dates, numbers and amounts are formatted in; `null` = the browser's. */
  locale: string | null
}

export const TEAM_ROLES = ['owner', 'admin', 'member'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

/** Roles that can be given by an invite (there is only one owner). */
export const INVITE_ROLES = ['admin', 'member'] as const
export type InviteRole = (typeof INVITE_ROLES)[number]

export const TEAM_MEMBER_STATUSES = ['active', 'invited'] as const
export type TeamMemberStatus = (typeof TEAM_MEMBER_STATUSES)[number]

export interface TeamMember {
  id: string
  /** `null` for an invited member who hasn't joined yet. */
  name: string | null
  email: string
  role: TeamRole
  status: TeamMemberStatus
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf_bundle'
export type ExportDestination = 'download' | 'email'
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed'

/** Columns the export can add besides the type's fields. */
export const EXPORT_BUILTIN_COLUMNS = ['document_id', 'file_name'] as const
export type ExportBuiltinColumn = (typeof EXPORT_BUILTIN_COLUMNS)[number]

export type ExportColumnSource =
  | { kind: 'field'; fieldId: string }
  | { kind: 'builtin'; id: ExportBuiltinColumn }

/** One row of the mapping, in output order. For a table field `header` names its sheet, file or column prefix. */
export interface ExportColumn {
  source: ExportColumnSource
  include: boolean
  header: string
}

/** separate = own sheet/file linked by Document ID; flatten = CSV, one row per table row */
export type TableExportMode = 'separate' | 'flatten'

export interface ExportColumnMapping {
  columns: ExportColumn[]
  /** table field id -> mode */
  tables: Record<string, TableExportMode>
}

/** The saved mapping of a type; shared by the team and stored apart from the type (it does not change its version). */
export interface ExportMapping extends ExportColumnMapping {
  typeId: string
  updatedAt: string
}

export interface ExportJob {
  id: string
  createdAt: string
  format: ExportFormat
  typeId: string
  documentIds: string[]
  destination: ExportDestination
  recipient?: string
  /** the mapping used for this job */
  columns: ExportColumnMapping
  status: ExportStatus
}

export interface CreateExportJobInput {
  format: ExportFormat
  typeId: string
  documentIds: string[]
  destination: ExportDestination
  recipient?: string
  columns: ExportColumnMapping
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
  /** nearby label, e.g. "Issue date:" */
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

export const FUNCTION_IDS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'percent',
  'round',
  'abs',
  'min',
  'max',
  'sum',
  'count',
  'average',
  'min_of',
  'max_of',
  'days_between',
  'add_days',
  'add_months',
  'end_of_month',
  'concat',
  'upper',
  'lower',
  'trim',
  'coalesce',
  'if_empty',
] as const
export type FunctionId = (typeof FUNCTION_IDS)[number]

/**
 * An expression is a tree: a field, a table column, a constant, or a function call.
 * Document-level only: `field` is a top-level scalar field, `column` a column of a top-level table field.
 */
export type Expr =
  | { kind: 'field'; fieldId: string }
  /** all values of a table column, as a list */
  | { kind: 'column'; fieldId: string; columnId: string }
  /** money: `value` is the amount in major units of the document's currency (12.5); the currency comes from the other money in the same call or comparison */
  | { kind: 'const'; type: ScalarFieldType; value: unknown }
  | { kind: 'call'; fn: FunctionId; args: Expr[] }

export const COMPARE_OPS = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte'] as const
export type CompareOp = (typeof COMPARE_OPS)[number]

export interface CheckAction {
  kind: 'check'
  id: string
  /** "Gross = Net + VAT" */
  label: string
  left: Expr
  op: CompareOp
  right: Expr
  /** allowed difference: major units of the document's currency for money (0.01), absolute for numbers */
  tolerance?: number
  severity: 'warning' | 'blocking'
}

export interface ComputeAction {
  kind: 'compute'
  id: string
  /** the target field; it is computed, never extracted */
  fieldId: string
  expr: Expr
}

export type FieldAction = CheckAction | ComputeAction

export interface DocumentType {
  id: string
  name: string
  /** what these documents are; also given to the AI for classification */
  description: string
  version: number
  fields: FieldDef[]
  /** checks and computed fields (spec 016) */
  actions: FieldAction[]
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
  /** documents whose value for the field equals `value` (trimmed, case-insensitive, whitespace collapsed) */
  group?: { fieldId: string; value: string }
}

/** To start from a template, copy its fields from listTemplates into `fields`. */
export type CreateDocumentTypeInput = Pick<
  DocumentType,
  'name' | 'description' | 'fields' | 'actions' | 'titleFieldId' | 'listColumnIds'
>

/** Changing any of these raises the type's version. */
export type UpdateDocumentTypeInput = Partial<CreateDocumentTypeInput>

/** Sum of one money field over the documents of a group. */
export interface GroupTotal {
  fieldId: string
  /** one per currency, sorted by currency code; empty when no document has a value */
  amounts: Money[]
}

export interface GroupValue {
  /** display form of the first occurrence */
  value: string
  count: number
  /** ISO datetime of the newest document in the group */
  lastDocumentAt: string
  /** one entry per total field of the type (money list columns), in list-column order; empty for a type without any */
  totals: GroupTotal[]
}

/** One groupable field of one type, for the groupings list. Counts exclude rejected documents. */
export interface GroupingSummary {
  typeId: string
  typeName: string
  fieldId: string
  fieldLabel: string
  /** distinct values after normalization */
  valueCount: number
  /** counted documents that have a value */
  documentCount: number
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

export interface SuggestTableInput {
  documentId: string
  page: number
  /** the rectangle drawn over the table */
  bbox: BBox
}

/** A guess for a table field from a rectangle: columns from the header line, a preview of the first rows. */
export interface TableSuggestion {
  label: string
  columns: ColumnDef[]
  preview: TableValue
  /** set when a part was assumed (a currency); the user must check it */
  warning?: string
  example: FieldExample
}

export interface TestExtractInput {
  fields: FieldDef[]
  /** computed fields (those targeted by a compute action) are left out of the result */
  actions?: FieldAction[]
  documentId: string
}

// ---------- plan (spec 011) ----------
export const PLAN_IDS = ['free', 'pro', 'business'] as const
export type PlanId = (typeof PLAN_IDS)[number]

export interface Plan {
  id: PlanId
  name: string
  documentsPerMonth: number
  /** `null` = unlimited */
  typeLimit: number | null
}

export interface PlanUsage {
  plan: Plan
  documentsThisMonth: number
  types: number
  /** ISO date, first day of the current month (local time) */
  periodStart: string
}
