export const INVOICE_STATUSES = [
  'uploaded',
  'processing',
  'needs_review',
  'approved',
  'exported',
  'rejected',
  'error',
] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type Confidence = 'high' | 'medium' | 'low'

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

/** Per-field AI extraction result. confidence is 0..1. */
export interface ExtractedField<T> {
  value: T | null
  confidence: number
}

/** Amount in minor units (grosze/cents) — always an integer. */
export interface Money {
  amount: number
  currency: CurrencyCode
}

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

export interface ListInvoicesParams {
  status?: InvoiceStatus
  search?: string
}

export type SupplierWithInvoices = Supplier & { invoices: Invoice[] }
