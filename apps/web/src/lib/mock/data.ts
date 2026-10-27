import { defaultExportMapping } from '@/lib/fields/export-mapping'
import type { Company, Document, ExportJob, TeamMember } from './types'
import { seedDocumentTypeVersions } from './document-types-seed'
import { buildSeedDocuments } from './documents-seed'
import type { SeedSupplier } from './documents-seed'
import { findValueMismatches } from './value-check'

export { seedDocumentTypes, seedDocumentTypeVersions } from './document-types-seed'
export { findValueMismatches } from './value-check'

// ---------- company & team ----------
export const seedCompany: Company = {
  name: 'Northwind Studio Ltd',
  taxId: 'TX-4821-0937',
  recipients: [{ id: 'rcp-001', name: 'Accountant', email: 'accounting@ledgerworks.example' }],
  defaultCurrency: 'USD',
  locale: null,
}

export const seedTeam: TeamMember[] = [
  { id: 'u1', name: 'Alex Morgan', email: 'alex@northwind-studio.example', role: 'owner' },
  { id: 'u2', name: 'Sam Rivera', email: 'sam@northwind-studio.example', role: 'admin' },
  { id: 'u3', name: 'Jordan Lee', email: 'jordan@northwind-studio.example', role: 'member' },
  { id: 'u4', name: 'Priya Shah', email: 'priya@northwind-studio.example', role: 'member' },
]

// private: the seed suppliers of the invoice, receipt and contract documents
const SEED_SUPPLIERS: SeedSupplier[] = [
  { name: 'Orange Polska S.A.', taxId: '5260250995', country: 'PL', email: 'faktury@orange.pl' },
  { name: 'Biuro Rachunkowe Eurosoft Sp. z o.o.', taxId: '7010123456', country: 'PL', email: 'biuro@eurosoft.pl' },
  { name: 'PKN ORLEN S.A.', taxId: '7740001454', country: 'PL' },
  { name: 'Przedsiębiorstwo Handlowo-Usługowo-Produkcyjne "Zielony Zakątek" Marian Kowalczyk i Wspólnicy Spółka Jawna', taxId: '6572831904', country: 'PL', email: 'zielonyzakatek@example.pl' },
  { name: 'Allegro sp. z o.o.', taxId: '5252674797', country: 'PL', email: 'faktury@allegro.pl' },
  { name: 'Hetzner Online GmbH', taxId: 'DE812871812', country: 'DE', email: 'billing@hetzner.com' },
  { name: 'SAP Deutschland SE & Co. KG', taxId: 'DE143454214', country: 'DE' },
  { name: 'Alza.cz a.s.', taxId: 'CZ27082440', country: 'CZ', email: 'faktury@alza.cz' },
  { name: 'Skoda Auto Servis Praha s.r.o.', taxId: 'CZ45274649', country: 'CZ' },
  { name: 'Notion Labs UK Ltd', taxId: 'GB354944102', country: 'GB', email: 'billing@notion.so' },
  { name: 'Amazon Web Services EMEA SARL', taxId: 'LU26888617', country: 'LU', email: 'aws-billing@amazon.com' },
  { name: 'Figma, Inc.', taxId: 'US-EIN 20-3633097', country: 'US', email: 'billing@figma.com' },
  { name: 'Sakura Cloud Systems K.K.', taxId: 'T1234567890123', country: 'JP', email: 'billing@sakura-cloud.example' },
  { name: 'Vercel Inc.', taxId: 'US-EIN 61-1788456', country: 'US', email: 'billing@vercel.com' },
]

// ---------- documents (spec 012) ----------
export const seedDocuments: Document[] = buildSeedDocuments(SEED_SUPPLIERS, seedCompany)

// ---------- export jobs ----------
const exportedIds = (typeId: string) =>
  seedDocuments.filter((d) => d.status === 'exported' && d.typeId === typeId).map((d) => d.id)
const exportedInvoices = exportedIds('type-invoice')
const exportedReceipts = exportedIds('type-receipt')
const seedMapping = (typeId: string) => {
  const versions = seedDocumentTypeVersions.filter((t) => t.id === typeId)
  const latest = versions.reduce((a, b) => (b.version > a.version ? b : a))
  return defaultExportMapping(latest)
}
const invoiceColumns = seedMapping('type-invoice')
const receiptColumns = seedMapping('type-receipt')

export const seedExportJobs: ExportJob[] = [
  { id: 'exp_001', createdAt: '2026-10-19T14:05:00.000Z', format: 'xlsx', typeId: 'type-invoice', documentIds: exportedInvoices.slice(0, 2), destination: 'email', recipient: seedCompany.recipients[0].email, columns: invoiceColumns, status: 'completed' },
  { id: 'exp_002', createdAt: '2026-10-12T09:40:00.000Z', format: 'csv', typeId: 'type-receipt', documentIds: exportedReceipts, destination: 'download', columns: receiptColumns, status: 'completed' },
  { id: 'exp_003', createdAt: '2026-10-05T16:20:00.000Z', format: 'pdf_bundle', typeId: 'type-invoice', documentIds: exportedInvoices.slice(0, 1), destination: 'email', recipient: seedCompany.recipients[0].email, columns: invoiceColumns, status: 'completed' },
  { id: 'exp_004', createdAt: '2026-09-28T11:00:00.000Z', format: 'csv', typeId: 'type-invoice', documentIds: exportedInvoices.slice(0, 2), destination: 'email', recipient: 'old-accountant@ledgerworks.example', columns: invoiceColumns, status: 'failed' },
  { id: 'exp_005', createdAt: '2026-09-21T08:15:00.000Z', format: 'xlsx', typeId: 'type-invoice', documentIds: exportedInvoices.slice(1, 2), destination: 'download', columns: invoiceColumns, status: 'completed' },
]

// The types can't tie a value to its field id, so check the seeds in dev (log only, never throw)
if (import.meta.env.DEV) {
  for (const doc of seedDocuments) {
    const type = seedDocumentTypeVersions.find((t) => t.id === doc.typeId && t.version === doc.typeVersion)
    for (const problem of findValueMismatches(doc, type)) console.error(`[mock seed] ${problem}`)
  }
}
