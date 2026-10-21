/**
 * Mock API layer. Every function here will be replaced by Supabase queries.
 *
 * The backend must provide:
 *  - Tables: invoices (+ line_items), suppliers, export_jobs, companies, team_members (RLS per company).
 *  - Storage bucket for uploaded invoice files; an upload -> OCR/LLM extraction pipeline that moves
 *    status uploaded -> processing -> needs_review | error and writes per-field confidence (0..1).
 *  - Amounts stored as integer minor units + ISO currency; dates as ISO strings.
 *  - Server-side filtering by status and text search (number, supplier, tax id, file name).
 *  - Approve/reject transitions with validation, export generation (csv/xlsx/pdf bundle) with
 *    download URL or email delivery, and role checks (owner/admin/member).
 */
import { seedCompany, seedExportJobs, seedInvoices, seedSuppliers, seedTeam } from './data'
import type {
  Company,
  CreateExportJobInput,
  ExportJob,
  Invoice,
  ListInvoicesParams,
  Supplier,
  SupplierWithInvoices,
  TeamMember,
} from './types'

function copy<T>(v: T): T {
  return structuredClone(v)
}

const db = {
  invoices: copy(seedInvoices),
  suppliers: copy(seedSuppliers),
  exportJobs: copy(seedExportJobs),
  company: copy(seedCompany),
  team: copy(seedTeam),
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 300)))
}

function findInvoice(id: string): Invoice {
  const inv = db.invoices.find((i) => i.id === id)
  if (!inv) throw new Error(`Invoice not found: ${id}`)
  return inv
}

export async function listInvoices(params: ListInvoicesParams = {}): Promise<Invoice[]> {
  await delay()
  const q = params.search?.trim().toLowerCase()
  const result = db.invoices.filter((inv) => {
    if (params.status && inv.status !== params.status) return false
    if (!q) return true
    return [inv.fileName, inv.number.value, inv.supplierName.value, inv.taxId.value].some((s) =>
      s?.toLowerCase().includes(q),
    )
  })
  result.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  return copy(result)
}

export async function getInvoice(id: string): Promise<Invoice> {
  await delay()
  return copy(findInvoice(id))
}

export async function updateInvoice(
  id: string,
  patch: Partial<Omit<Invoice, 'id'>>,
): Promise<Invoice> {
  await delay()
  const inv = findInvoice(id)
  Object.assign(inv, copy(patch))
  return copy(inv)
}

export async function approveInvoices(ids: string[]): Promise<Invoice[]> {
  await delay()
  const out: Invoice[] = []
  for (const id of ids) {
    const inv = findInvoice(id)
    if (inv.status === 'needs_review' || inv.status === 'rejected') {
      inv.status = 'approved'
      delete inv.rejectionReason
    }
    out.push(copy(inv))
  }
  return out
}

export async function rejectInvoice(id: string, reason: string): Promise<Invoice> {
  await delay()
  const inv = findInvoice(id)
  inv.status = 'rejected'
  inv.rejectionReason = reason
  return copy(inv)
}

export async function listSuppliers(): Promise<Supplier[]> {
  await delay()
  return copy(db.suppliers)
}

export async function getSupplier(id: string): Promise<SupplierWithInvoices> {
  await delay()
  const s = db.suppliers.find((x) => x.id === id)
  if (!s) throw new Error(`Supplier not found: ${id}`)
  return copy({ ...s, invoices: db.invoices.filter((i) => i.supplierId === id) })
}

export async function listExportJobs(): Promise<ExportJob[]> {
  await delay()
  return copy([...db.exportJobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export async function createExportJob(input: CreateExportJobInput): Promise<ExportJob> {
  await delay()
  const job: ExportJob = {
    id: `exp_${String(db.exportJobs.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    format: input.format,
    invoiceIds: [...input.invoiceIds],
    destination: input.destination,
    recipient: input.recipient,
    status: 'completed',
  }
  db.exportJobs.push(job)
  for (const id of input.invoiceIds) {
    const inv = db.invoices.find((i) => i.id === id)
    if (inv && inv.status === 'approved') inv.status = 'exported'
  }
  return copy(job)
}

export async function getCompany(): Promise<Company> {
  await delay()
  return copy(db.company)
}

export async function updateCompany(patch: Partial<Company>): Promise<Company> {
  await delay()
  Object.assign(db.company, patch)
  return copy(db.company)
}

export async function listTeam(): Promise<TeamMember[]> {
  await delay()
  return copy(db.team)
}
