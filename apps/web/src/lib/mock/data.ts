import type {
  Company,
  CurrencyCode,
  Document,
  ExportJob,
  ExtractedField,
  FileType,
  Invoice,
  InvoiceStatus,
  LineItem,
  Supplier,
  TeamMember,
} from './types'
import { seedDocumentTypeVersions } from './document-types-seed'
import { buildSeedDocuments } from './documents-seed'
import { BASE_NOW, DAY, isoDate, makeRng } from './seed-utils'
import { findValueMismatches } from './value-check'

export { seedDocumentTypes, seedDocumentTypeVersions } from './document-types-seed'
export { findValueMismatches } from './value-check'

// ---------- company & team ----------
export const seedCompany: Company = {
  name: 'Kowalski Studio Sp. z o.o.',
  taxId: '5252344078',
  accountantEmail: 'ksiegowosc@biuro-rachunkowe.pl',
  defaultCurrency: 'PLN',
}

export const seedTeam: TeamMember[] = [
  { id: 'u1', name: 'Anna Kowalska', email: 'anna@kowalski-studio.pl', role: 'owner' },
  { id: 'u2', name: 'Piotr Nowak', email: 'piotr@kowalski-studio.pl', role: 'admin' },
  { id: 'u3', name: 'Katarzyna Wiśniewska', email: 'kasia@kowalski-studio.pl', role: 'member' },
  { id: 'u4', name: 'Michał Zieliński', email: 'michal@kowalski-studio.pl', role: 'member' },
]

// ---------- suppliers ----------
/** @deprecated the invoice model is replaced by seedDocuments (spec 012); removed in slice 3 */
export const seedSuppliers: Supplier[] = [
  { id: 's1', name: 'Orange Polska S.A.', taxId: '5260250995', country: 'PL', address: 'al. Jerozolimskie 160, 02-326 Warszawa', email: 'faktury@orange.pl' },
  { id: 's2', name: 'Biuro Rachunkowe Eurosoft Sp. z o.o.', taxId: '7010123456', country: 'PL', address: 'ul. Marszałkowska 12/4, 00-590 Warszawa', email: 'biuro@eurosoft.pl' },
  { id: 's3', name: 'PKN ORLEN S.A.', taxId: '7740001454', country: 'PL', address: 'ul. Chemików 7, 09-411 Płock' },
  { id: 's4', name: 'Przedsiębiorstwo Handlowo-Usługowo-Produkcyjne "Zielony Zakątek" Marian Kowalczyk i Wspólnicy Spółka Jawna', taxId: '6572831904', country: 'PL', address: 'ul. Leśna 3, 33-100 Tarnów', email: 'zielonyzakatek@example.pl' },
  { id: 's5', name: 'Allegro sp. z o.o.', taxId: '5252674797', country: 'PL', address: 'ul. Grunwaldzka 182, 60-166 Poznań', email: 'faktury@allegro.pl' },
  { id: 's6', name: 'Hetzner Online GmbH', taxId: 'DE812871812', country: 'DE', address: 'Industriestr. 25, 91710 Gunzenhausen', email: 'billing@hetzner.com' },
  { id: 's7', name: 'SAP Deutschland SE & Co. KG', taxId: 'DE143454214', country: 'DE', address: 'Hasso-Plattner-Ring 7, 69190 Walldorf' },
  { id: 's8', name: 'Alza.cz a.s.', taxId: 'CZ27082440', country: 'CZ', address: 'Jankovcova 1522/53, 170 00 Praha 7', email: 'faktury@alza.cz' },
  { id: 's9', name: 'Skoda Auto Servis Praha s.r.o.', taxId: 'CZ45274649', country: 'CZ', address: 'Klicanska 12, 181 00 Praha 8' },
  { id: 's10', name: 'Notion Labs UK Ltd', taxId: 'GB354944102', country: 'GB', address: '71-75 Shelton Street, London WC2H 9JQ', email: 'billing@notion.so' },
  { id: 's11', name: 'Amazon Web Services EMEA SARL', taxId: 'LU26888617', country: 'LU', address: '38 Avenue John F. Kennedy, L-1855 Luxembourg', email: 'aws-billing@amazon.com' },
  { id: 's12', name: 'Figma, Inc.', taxId: 'US-EIN 20-3633097', country: 'US', address: '760 Market Street, San Francisco, CA 94102', email: 'billing@figma.com' },
]

// ---------- invoice generation ----------
const DESCRIPTIONS = [
  'Usługi telekomunikacyjne – abonament miesięczny',
  'Paliwo ON – stacja Płock',
  'Obsługa księgowa za miesiąc',
  'Serwer dedykowany AX102, opłata miesięczna',
  'Licencja oprogramowania – 10 użytkowników',
  'Materiały biurowe (papier A4, toner, segregatory)',
  'Hosting i domeny – odnowienie roczne',
  'Usługa serwisowa pojazdu służbowego – przegląd okresowy, wymiana oleju i filtrów',
  'Subskrypcja Team Plan – Annual, includes unlimited projects and advanced collaboration features for design and engineering teams',
  'Cloud compute (EC2) – usage for billing period',
  'Monitor 27" 4K',
  'Transport krajowy – przesyłka kurierska',
  'Szkolenie online – cykl warsztatów',
  'Opłata za magazynowanie danych',
]
const UNITS = ['szt.', 'usł.', 'mc', 'l', 'godz.', 'kpl.']
const VAT_BY_COUNTRY: Record<string, number[]> = {
  PL: [23, 23, 8, 5],
  DE: [0],
  CZ: [0],
  GB: [0],
  LU: [0],
  US: [0],
}

function makeLines(rng: () => number, count: number, vatChoices: number[], idPrefix: string): LineItem[] {
  const lines: LineItem[] = []
  for (let i = 0; i < count; i++) {
    const quantity = 1 + Math.floor(rng() * 12)
    const unitNet = 500 + Math.floor(rng() * 150_000)
    const vatRate = vatChoices[Math.floor(rng() * vatChoices.length)]
    const net = quantity * unitNet
    const vat = Math.round((net * vatRate) / 100)
    lines.push({
      id: `${idPrefix}-l${i + 1}`,
      description:
        DESCRIPTIONS[Math.floor(rng() * DESCRIPTIONS.length)] + (count > 50 ? ` – poz. ${i + 1}` : ''),
      quantity,
      unit: UNITS[Math.floor(rng() * UNITS.length)],
      unitNet,
      vatRate,
      net,
      vat,
      gross: net + vat,
    })
  }
  return lines
}

// Status plan for the 40 invoices (index = invoice number - 1)
const STATUS_PLAN: InvoiceStatus[] = [
  'uploaded', 'uploaded', 'uploaded',
  'processing', 'processing', 'processing',
  'needs_review', 'needs_review', 'needs_review', 'needs_review', 'needs_review', 'needs_review',
  'needs_review', 'needs_review', 'needs_review', 'needs_review', 'needs_review', 'needs_review',
  'approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'approved', 'approved',
  'exported', 'exported', 'exported', 'exported', 'exported', 'exported', 'exported', 'exported',
  'rejected', 'rejected', 'rejected',
  'error', 'error', 'error',
]
const ERROR_MESSAGES = [
  'Could not read the document: the file is password-protected.',
  'No invoice detected. The page appears to be a bank statement or a delivery note.',
  'Image quality too low (resolution below 100 dpi). Please upload a sharper scan.',
]
const REJECTION_REASONS = [
  'Duplicate of an invoice already processed.',
  'Invoice issued to a different company (wrong buyer NIP).',
  'Not a business expense — private purchase.',
]
const CURRENCY_BY_COUNTRY: Record<string, CurrencyCode> = {
  PL: 'PLN',
  DE: 'EUR',
  CZ: 'EUR',
  LU: 'EUR',
  GB: 'GBP',
  US: 'USD',
}
const FILE_TYPES: FileType[] = ['pdf', 'pdf', 'pdf', 'jpg', 'png']

function field<T>(value: T, confidence: number): ExtractedField<T> {
  return { value, confidence }
}
function empty<T>(): ExtractedField<T> {
  return { value: null, confidence: 0 }
}

function buildInvoice(i: number): Invoice {
  const rng = makeRng(1000 + i * 7919)
  const status = STATUS_PLAN[i]
  const supplier = seedSuppliers[i % seedSuppliers.length]
  const currency: CurrencyCode =
    supplier.country === 'PL' && i % 9 === 4 ? 'EUR' : CURRENCY_BY_COUNTRY[supplier.country]
  const id = `inv_${String(i + 1).padStart(3, '0')}`
  const fileType = FILE_TYPES[Math.floor(rng() * FILE_TYPES.length)]
  const uploadedMs = BASE_NOW - (40 - i) * 0.9 * DAY - Math.floor(rng() * 6) * 3_600_000
  const fileNameBase = `${supplier.name.split(/[\s,.]/)[0].toLowerCase()}_${isoDate(uploadedMs).replace(/-/g, '')}_${i + 1}`
  const base = {
    id,
    fileName:
      i === 12
        ? `skan_faktury_za_materialy_biurowe_i_uslugi_serwisowe_wrzesien_2026_wersja_ostateczna_podpisana.${fileType}`
        : `${fileNameBase}.${fileType}`,
    fileType,
    pageCount: 1 + Math.floor(rng() * 3),
    uploadedAt: new Date(uploadedMs).toISOString(),
    status,
  }

  if (status === 'uploaded' || status === 'processing' || status === 'error') {
    return {
      ...base,
      supplierId: null,
      errorMessage: status === 'error' ? ERROR_MESSAGES[i - 37] : undefined,
      supplierName: empty(),
      taxId: empty(),
      number: empty(),
      issueDate: empty(),
      saleDate: empty(),
      dueDate: empty(),
      currency: empty(),
      net: empty(),
      vat: empty(),
      gross: empty(),
      lineItems: [],
      overallConfidence: 0,
      ksef: false,
    }
  }

  const lineCount = i === 7 ? 64 : 1 + Math.floor(rng() * 5)
  const lineItems = makeLines(rng, lineCount, VAT_BY_COUNTRY[supplier.country] ?? [0], id)
  const net = lineItems.reduce((s, l) => s + l.net, 0)
  const vat = lineItems.reduce((s, l) => s + l.vat, 0)
  const issueMs = uploadedMs - Math.floor(rng() * 5 + 1) * DAY
  const needsReview = status === 'needs_review'
  const ksef = supplier.country === 'PL' && rng() > 0.4

  // reviewed/approved invoices are mostly high confidence; needs_review has some low fields
  const conf = (): number => {
    const r = rng()
    if (!needsReview) return 0.9 + rng() * 0.1
    return r < 0.25 ? 0.35 + rng() * 0.3 : r < 0.5 ? 0.7 + rng() * 0.19 : 0.9 + rng() * 0.1
  }
  const confs = {
    supplierName: conf(),
    taxId: conf(),
    number: conf(),
    issueDate: conf(),
    saleDate: conf(),
    dueDate: conf(),
    currency: conf(),
    net: conf(),
    vat: conf(),
    gross: conf(),
  }
  if (needsReview && i % 3 === 0) confs.gross = 0.42 // guarantee some low-confidence rows
  if (needsReview && i % 4 === 1) confs.taxId = 0.55
  const overall = Object.values(confs).reduce((s, c) => s + c, 0) / 10

  return {
    ...base,
    supplierId: supplier.id,
    rejectionReason: status === 'rejected' ? REJECTION_REASONS[i - 34] : undefined,
    supplierName: field(supplier.name, confs.supplierName),
    taxId: field(supplier.taxId, confs.taxId),
    number: field(`FV/2026/${100 + i * 3}/${(i % 12) + 1}`, confs.number),
    issueDate: field(isoDate(issueMs), confs.issueDate),
    saleDate: field(isoDate(issueMs - (i % 3) * DAY), confs.saleDate),
    dueDate: field(isoDate(issueMs + 14 * DAY), confs.dueDate),
    currency: field(currency, confs.currency),
    net: field(net, confs.net),
    vat: field(vat, confs.vat),
    gross: field(net + vat, confs.gross),
    lineItems,
    overallConfidence: Math.round(overall * 100) / 100,
    ksef,
  }
}

/** @deprecated the invoice model is replaced by seedDocuments (spec 012); removed in slice 3 */
export const seedInvoices: Invoice[] = STATUS_PLAN.map((_, i) => buildInvoice(i))

// ---------- export jobs ----------
const exportedIds = seedInvoices.filter((inv) => inv.status === 'exported').map((inv) => inv.id)

export const seedExportJobs: ExportJob[] = [
  { id: 'exp_001', createdAt: '2026-10-19T14:05:00.000Z', format: 'xlsx', invoiceIds: exportedIds.slice(0, 3), destination: 'email', recipient: seedCompany.accountantEmail, status: 'completed' },
  { id: 'exp_002', createdAt: '2026-10-12T09:40:00.000Z', format: 'csv', invoiceIds: exportedIds.slice(3, 6), destination: 'download', status: 'completed' },
  { id: 'exp_003', createdAt: '2026-10-05T16:20:00.000Z', format: 'pdf_bundle', invoiceIds: exportedIds.slice(5, 8), destination: 'email', recipient: seedCompany.accountantEmail, status: 'completed' },
  { id: 'exp_004', createdAt: '2026-09-28T11:00:00.000Z', format: 'csv', invoiceIds: exportedIds.slice(0, 2), destination: 'email', recipient: 'stary-ksiegowy@example.pl', status: 'failed' },
  { id: 'exp_005', createdAt: '2026-09-21T08:15:00.000Z', format: 'xlsx', invoiceIds: exportedIds.slice(2, 4), destination: 'download', status: 'completed' },
]

// ---------- documents (spec 012) ----------
export const seedDocuments: Document[] = buildSeedDocuments(seedSuppliers, seedCompany)

// The types can't tie a value to its field id, so check the seeds in dev (log only, never throw)
if (import.meta.env.DEV) {
  for (const doc of seedDocuments) {
    const type = seedDocumentTypeVersions.find((t) => t.id === doc.typeId && t.version === doc.typeVersion)
    for (const problem of findValueMismatches(doc, type)) console.error(`[mock seed] ${problem}`)
  }
}
