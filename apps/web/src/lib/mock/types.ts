/** @deprecated replaced by DOCUMENT_STATUSES (spec 012); removed in slice 5 */
export const INVOICE_STATUSES = [
  'uploaded',
  'processing',
  'needs_review',
  'approved',
  'exported',
  'rejected',
  'error',
] as const
/** @deprecated replaced by DocumentStatus (spec 012); removed in slice 5 */
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type Confidence = 'high' | 'medium' | 'low'

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/**
 * Per-field AI extraction result. confidence is 0..1.
 * @deprecated replaced by ExtractedValue (spec 012); removed in slice 2
 */
export interface ExtractedField<T> {
  value: T | null
  confidence: number
}

/** Amount in minor units (grosze/cents) — always an integer. */
export interface Money {
  amount: number
  currency: CurrencyCode
}

/** @deprecated replaced by Document values (spec 012); removed in slice 2 */
export interface Supplier {
  id: string
  name: string
  /** NIP for Polish suppliers, VAT ID (e.g. DE123456789) for foreign ones */
  taxId: string
  /** ISO 3166-1 alpha-2 */
  country: string
  address: string
  email?: string
}

/** @deprecated replaced by TableValue (spec 012); removed in slice 2 */
export interface LineItem {
  id: string
  description: string
  quantity: number
  unit: string
  /** minor units */
  unitNet: number
  /** percent, e.g. 23; 0 for reverse charge / non-EU */
  vatRate: number
  net: number
  vat: number
  gross: number
}

export type FileType = 'pdf' | 'jpg' | 'png'

/** @deprecated replaced by Document (spec 012); removed in slice 2 */
export interface Invoice {
  id: string
  fileName: string
  fileType: FileType
  pageCount: number
  /** ISO datetime */
  uploadedAt: string
  status: InvoiceStatus
  errorMessage?: string
  rejectionReason?: string
  supplierId: string | null
  supplierName: ExtractedField<string>
  taxId: ExtractedField<string>
  number: ExtractedField<string>
  /** ISO dates (YYYY-MM-DD) */
  issueDate: ExtractedField<string>
  saleDate: ExtractedField<string>
  dueDate: ExtractedField<string>
  currency: ExtractedField<CurrencyCode>
  /** minor units */
  net: ExtractedField<number>
  vat: ExtractedField<number>
  gross: ExtractedField<number>
  lineItems: LineItem[]
  overallConfidence: number
  /** true if the invoice came through / is registered in KSeF */
  ksef: boolean
}

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
  invoiceIds: string[]
  destination: ExportDestination
  recipient?: string
  status: ExportStatus
}

export interface CreateExportJobInput {
  format: ExportFormat
  invoiceIds: string[]
  destination: ExportDestination
  recipient?: string
}

/** @deprecated replaced by the document list params (spec 012); removed in slice 3 */
export interface ListInvoicesParams {
  status?: InvoiceStatus
  search?: string
}

/** @deprecated replaced by group values (spec 012); removed in slice 3 */
export type SupplierWithInvoices = Supplier & { invoices: Invoice[] }

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
