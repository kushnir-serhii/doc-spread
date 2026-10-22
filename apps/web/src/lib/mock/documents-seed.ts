// Seed documents for the mock API: ~27 documents over the three templates, in every status.
// Built from data.ts (which passes the supplier list) and re-exported there. Not part of the public mock API.
import { seedDocumentTypeVersions } from './document-types-seed'
import { INVOICE_SOURCES, RECEIPT_SOURCES } from './showcase-sources'
import { BASE_NOW, DAY, isoDate, makeRng } from './seed-utils'
import type { CurrencyCode, Document, DocumentStatus, DocumentType, FieldValue, FileType } from './types'
import {
  booleanValue,
  dateValue,
  emailValue,
  keyedValues,
  moneyValue,
  numberValue,
  overallConfidence,
  phoneValue,
  selectValue,
  tableValue,
  taxIdValue,
  textValue,
} from './value-builders'

export interface SeedSupplier {
  name: string
  taxId: string
  country: string
  email?: string
}

export const SAMPLE_PDF_URL = '/mock/sample-invoice.pdf'
export const SAMPLE_JPG_URL = '/mock/sample-receipt.jpg'
export const SAMPLE_PDF_TOKENS_URL = '/mock/sample-invoice.tokens.json'
export const SAMPLE_JPG_TOKENS_URL = '/mock/sample-receipt.tokens.json'

type Kind = 'invoice' | 'receipt' | 'contract'

interface DocPlan {
  status: DocumentStatus
  /** null: the type isn't known yet (uploaded, processing, unclassified, error) */
  kind: Kind | null
  /** type version the document was extracted with; omitted means the current one */
  version?: number
  /** index into the supplier list */
  supplier?: number
  currency?: CurrencyCode
  lines?: number
  /** a low-confidence extraction with some empty values */
  review?: boolean
  /** the document is backed by the sample file and its values carry a source bbox */
  showcase?: boolean
  fileType?: FileType
  fileName?: string
  /** unclassified only; omitted means no classification at all */
  classification?: number
}

const PLAN: DocPlan[] = [
  /* 001 */ { status: 'needs_review', kind: 'invoice', showcase: true },
  /* 002 */ { status: 'needs_review', kind: 'receipt', showcase: true },
  /* 003 */ { status: 'uploaded', kind: null, fileType: 'pdf' },
  /* 004 */ { status: 'uploaded', kind: null, fileType: 'jpg' },
  /* 005 */ { status: 'processing', kind: null, fileType: 'pdf' },
  /* 006 */ { status: 'processing', kind: null, fileType: 'jpg' },
  /* 007 */ { status: 'unclassified', kind: null, fileType: 'pdf', classification: 0.31 },
  /* 008 */ { status: 'unclassified', kind: null, fileType: 'jpg' },
  /* 009 */ { status: 'needs_review', kind: 'invoice', supplier: 5, currency: 'EUR', lines: 64, review: true },
  {
    /* 010 */ status: 'needs_review',
    kind: 'invoice',
    version: 1,
    supplier: 3,
    review: true,
    fileName: 'skan_faktury_za_materialy_biurowe_i_uslugi_serwisowe_wrzesien_2026_wersja_ostateczna_podpisana.pdf',
  },
  /* 011 */ { status: 'needs_review', kind: 'invoice', supplier: 9, review: true },
  /* 012 */ { status: 'needs_review', kind: 'receipt', review: true },
  /* 013 */ { status: 'needs_review', kind: 'contract', supplier: 3, review: true },
  /* 014 */ { status: 'needs_review', kind: 'contract', supplier: 6, review: true },
  /* 015 */ { status: 'approved', kind: 'invoice', version: 1, supplier: 0 },
  /* 016 */ { status: 'approved', kind: 'invoice', supplier: 7, lines: 6 },
  /* 017 */ { status: 'approved', kind: 'receipt' },
  /* 018 */ { status: 'approved', kind: 'contract', supplier: 1 },
  /* 019 */ { status: 'approved', kind: 'invoice', supplier: 4, lines: 12 },
  /* 020 */ { status: 'exported', kind: 'invoice', version: 1, supplier: 2 },
  /* 021 */ { status: 'exported', kind: 'invoice', supplier: 11 },
  /* 022 */ { status: 'exported', kind: 'receipt' },
  /* 023 */ { status: 'exported', kind: 'contract', supplier: 10 },
  /* 024 */ { status: 'rejected', kind: 'invoice', supplier: 1 },
  /* 025 */ { status: 'rejected', kind: 'receipt' },
  /* 026 */ { status: 'error', kind: null, fileType: 'pdf' },
  /* 027 */ { status: 'error', kind: null, fileType: 'jpg' },
]

const ERROR_MESSAGES = [
  'Could not read the document: the file is password-protected.',
  'Image quality too low (resolution below 100 dpi). Please upload a sharper scan.',
]
const REJECTION_REASONS = [
  'Duplicate of an invoice already processed.',
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
const VAT_BY_COUNTRY: Record<string, number[]> = {
  PL: [23, 23, 8, 5],
  DE: [0],
  CZ: [0],
  GB: [0],
  LU: [0],
  US: [0],
}
const PHONE_PREFIX: Record<string, string> = {
  PL: '+48 22',
  DE: '+49 6227',
  CZ: '+420 2',
  GB: '+44 20',
  LU: '+352 27',
  US: '+1 415',
}

const LINE_DESCRIPTIONS = [
  'Usługi telekomunikacyjne – abonament miesięczny',
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

const MERCHANTS = [
  { name: 'Piekarnia Pod Dębem s.c.', taxId: '6762451390' },
  { name: 'Drogeria Natura Sp. z o.o.', taxId: '5272918346' },
  { name: 'Księgarnia Literka', taxId: '9452107733' },
  {
    name: 'Papiernik – Artykuły Biurowe i Szkolne Zbigniew Wrona i Wspólnicy Spółka Jawna',
    taxId: '8943016527',
  },
]
const RECEIPT_ITEMS: [string, number][] = [
  ['Chleb pszenny', 450],
  ['Bułki kajzerki 6 szt.', 720],
  ['Kawa mielona 500g', 2499],
  ['Papier A4 500 ark.', 2299],
  ['Długopis żelowy niebieski', 349],
  ['Zeszyt A5 w kratkę 60 kartek, oprawa twarda, okładka laminowana', 599],
  ['Płyn do mycia naczyń 750ml', 1199],
  ['Baterie AA 4 szt.', 1899],
]

const round2 = (n: number) => Math.round(n * 100) / 100
const pick = <T>(rng: () => number, items: readonly T[]): T => items[Math.floor(rng() * items.length)]
const compactDate = (ms: number) => isoDate(ms).replace(/-/g, '')
const firstWord = (name: string) => name.split(/[\s,.]/)[0].toLowerCase()

/** Per-value confidence: high for clean documents, a mix of low and middling for review ones. */
const makeConfidence = (rng: () => number, review: boolean) => (): number => {
  if (!review) return round2(0.9 + rng() * 0.1)
  const r = rng()
  return round2(r < 0.25 ? 0.35 + rng() * 0.3 : r < 0.5 ? 0.7 + rng() * 0.19 : 0.9 + rng() * 0.1)
}

interface Ctx {
  rng: () => number
  id: string
  index: number
  review: boolean
  supplier: SeedSupplier
  currency: CurrencyCode
  uploadedMs: number
  type: DocumentType
}

// ---------- invoices ----------
const invoiceValues = (c: Ctx, lineCount: number): Record<string, FieldValue> => {
  const { rng, id, index, review, supplier, currency } = c
  const conf = makeConfidence(rng, review)
  const vatChoices = VAT_BY_COUNTRY[supplier.country] ?? [0]

  let net = 0
  let vat = 0
  const rows = Array.from({ length: lineCount }, (_, i) => {
    const quantity = 1 + Math.floor(rng() * 12)
    const unitNet = 500 + Math.floor(rng() * 150_000)
    const vatRate = pick(rng, vatChoices)
    const rowNet = quantity * unitNet
    const rowVat = Math.round((rowNet * vatRate) / 100)
    net += rowNet
    vat += rowVat
    return {
      id: `${id}-l${i + 1}`,
      cells: {
        description: textValue(pick(rng, LINE_DESCRIPTIONS) + (lineCount > 50 ? ` – poz. ${i + 1}` : ''), conf()),
        quantity: numberValue(quantity, conf()),
        unit: textValue(pick(rng, UNITS), conf()),
        unit_net: moneyValue(unitNet, currency, conf()),
        vat_rate: numberValue(vatRate, conf()),
        net: moneyValue(rowNet, currency, conf()),
        vat: moneyValue(rowVat, currency, conf()),
        gross: moneyValue(rowNet + rowVat, currency, conf()),
      },
    }
  })

  const issueMs = c.uploadedMs - (Math.floor(rng() * 5) + 1) * DAY
  const values: Record<string, FieldValue> = {
    supplier_name: textValue(supplier.name, conf()),
    supplier_tax_id: taxIdValue(supplier.taxId, review && index % 4 === 1 ? 0.55 : conf()),
    invoice_number: textValue(`FV/2026/${100 + index * 3}/${(index % 12) + 1}`, conf()),
    issue_date: dateValue(isoDate(issueMs), conf()),
    sale_date:
      review && index % 2 === 1 ? dateValue(null, 0) : dateValue(isoDate(issueMs - (index % 3) * DAY), conf()),
    due_date:
      review && index % 3 === 1 ? dateValue(null, 0) : dateValue(isoDate(issueMs + 14 * DAY), conf()),
    net_total: moneyValue(net, currency, conf()),
    vat_total: moneyValue(vat, currency, conf()),
    gross_total: moneyValue(net + vat, currency, review && index % 3 === 0 ? 0.42 : conf()),
    ksef: booleanValue(supplier.country === 'PL' && rng() > 0.4, conf()),
    line_items: tableValue(rows),
  }
  // version 2 of the Invoice type added the order number
  if (c.type.fields.some((f) => f.key === 'order_number')) {
    values.order_number = index % 2 === 0 ? textValue(`ZAM/2026/${100 + index}`, conf()) : textValue(null, 0)
  }
  return values
}

const showcaseInvoiceValues = (id: string): Record<string, FieldValue> => {
  const s = INVOICE_SOURCES
  const currency = 'PLN'
  // the same rows and amounts as printed on sample-invoice.pdf (see scripts/generate-mock-files.py)
  const lines = [
    ['Konsultacje wdrozeniowe - etap 1', 10, 'godz.', 15000, 23, 150000, 34500, 184500],
    ['Licencja Demo Suite - 5 uzytkownikow', 5, 'szt.', 20000, 23, 100000, 23000, 123000],
    ['Szkolenie online dla zespolu', 1, 'usl.', 80000, 23, 80000, 18400, 98400],
    ['Hosting - abonament miesieczny', 3, 'mc', 4900, 23, 14700, 3381, 18081],
  ] as const
  return {
    supplier_name: textValue('Demo Software Polska Sp. z o.o.', 0.98, s.supplier_name),
    supplier_tax_id: taxIdValue('1234567890', 0.95, s.supplier_tax_id),
    invoice_number: textValue('FV/2026/10/0042', 0.97, s.invoice_number),
    issue_date: dateValue('2026-10-14', 0.96, s.issue_date),
    sale_date: dateValue('2026-10-14', 0.93, s.sale_date),
    due_date: dateValue('2026-10-28', 0.62, s.due_date),
    net_total: moneyValue(344700, currency, 0.97, s.net_total),
    vat_total: moneyValue(79281, currency, 0.94, s.vat_total),
    gross_total: moneyValue(423981, currency, 0.97, s.gross_total),
    ksef: booleanValue(true, 0.74, s.ksef),
    order_number: textValue(null, 0),
    line_items: tableValue(
      lines.map((l, i) => {
        const src = s.line_items[i]
        return {
          id: `${id}-l${i + 1}`,
          cells: {
            description: textValue(l[0], 0.95, src.description),
            quantity: numberValue(l[1], 0.96, src.quantity),
            unit: textValue(l[2], 0.9, src.unit),
            unit_net: moneyValue(l[3], currency, 0.93, src.unit_net),
            vat_rate: numberValue(l[4], 0.97, src.vat_rate),
            net: moneyValue(l[5], currency, 0.95, src.net),
            vat: moneyValue(l[6], currency, 0.94, src.vat),
            gross: moneyValue(l[7], currency, 0.95, src.gross),
          },
        }
      }),
    ),
  }
}

// ---------- receipts ----------
const receiptValues = (c: Ctx): Record<string, FieldValue> => {
  const { rng, id, index, review, currency } = c
  const conf = makeConfidence(rng, review)
  const merchant = MERCHANTS[index % MERCHANTS.length]
  const count = 2 + Math.floor(rng() * 4)
  let total = 0
  const rows = Array.from({ length: count }, (_, i) => {
    const [name, price] = pick(rng, RECEIPT_ITEMS)
    const quantity = 1 + Math.floor(rng() * 3)
    total += quantity * price
    return {
      id: `${id}-i${i + 1}`,
      cells: {
        description: textValue(name, conf()),
        quantity: numberValue(quantity, conf()),
        price: moneyValue(quantity * price, currency, conf()),
      },
    }
  })
  return {
    merchant: textValue(merchant.name, conf()),
    merchant_tax_id: taxIdValue(merchant.taxId, conf()),
    receipt_date: dateValue(isoDate(c.uploadedMs - (Math.floor(rng() * 4) + 1) * DAY), conf()),
    total: moneyValue(total, currency, review ? 0.42 : conf()),
    tax_total: review ? moneyValue(null, currency, 0) : moneyValue(Math.round((total * 23) / 123), currency, conf()),
    payment_method: selectValue(pick(rng, ['Card', 'Cash', 'Transfer']), conf()),
    items: tableValue(rows),
  }
}

const showcaseReceiptValues = (id: string): Record<string, FieldValue> => {
  const s = RECEIPT_SOURCES
  const currency = 'PLN'
  // the same rows and amounts as printed on sample-receipt.jpg
  const items = [
    ['Chleb pszenny', 1, 450],
    ['Mleko 3.2% 1L', 2, 598],
    ['Ser zolty Gouda 250g', 1, 899],
    ['Woda mineralna 1.5L', 2, 640],
    ['Kawa mielona 500g', 1, 2499],
  ] as const
  return {
    merchant: textValue('ZIELONY KOSZYK Sp. z o.o.', 0.96, s.merchant),
    merchant_tax_id: taxIdValue('1234563218', 0.93, s.merchant_tax_id),
    receipt_date: dateValue('2026-10-14', 0.95, s.receipt_date),
    total: moneyValue(5086, currency, 0.97, s.total),
    tax_total: moneyValue(951, currency, 0.81, s.tax_total),
    payment_method: selectValue('Card', 0.7, s.payment_method),
    items: tableValue(
      items.map((it, i) => ({
        id: `${id}-i${i + 1}`,
        cells: {
          description: textValue(it[0], 0.92, s.items[i].description),
          quantity: numberValue(it[1], 0.9, s.items[i].quantity),
          price: moneyValue(it[2], currency, 0.94, s.items[i].price),
        },
      })),
    ),
  }
}

// ---------- contracts ----------
const contractValues = (c: Ctx, company: { name: string; taxId: string }): Record<string, FieldValue> => {
  const { rng, id, index, review, supplier, currency } = c
  const conf = makeConfidence(rng, review)
  const signingMs = c.uploadedMs - (3 + Math.floor(rng() * 18)) * DAY
  const startMs = signingMs + 7 * DAY
  const phone = `${PHONE_PREFIX[supplier.country] ?? '+48 22'} 555 01 ${String(10 + (index % 80)).padStart(2, '0')}`
  return {
    contract_number: textValue(`UMO/2026/${String(index + 1).padStart(3, '0')}`, conf()),
    parties: tableValue([
      { id: `${id}-p1`, cells: { name: textValue(company.name, conf()), tax_id: taxIdValue(company.taxId, conf()) } },
      { id: `${id}-p2`, cells: { name: textValue(supplier.name, conf()), tax_id: taxIdValue(supplier.taxId, conf()) } },
    ]),
    counterparty: textValue(supplier.name, conf()),
    counterparty_tax_id: taxIdValue(supplier.taxId, conf()),
    counterparty_email: supplier.email ? emailValue(supplier.email, conf()) : emailValue(null, 0),
    counterparty_phone: phoneValue(phone, conf()),
    signing_date: dateValue(isoDate(signingMs), conf()),
    start_date: dateValue(isoDate(startMs), conf()),
    end_date: review && index % 2 === 1 ? dateValue(null, 0) : dateValue(isoDate(startMs + 365 * DAY), conf()),
    value: moneyValue((5 + Math.floor(rng() * 195)) * 100_000, currency, conf()),
    auto_renewal: booleanValue(rng() > 0.5, conf()),
  }
}

// ---------- documents ----------
const findType = (typeId: string, version?: number): DocumentType => {
  const versions = seedDocumentTypeVersions.filter((t) => t.id === typeId)
  const type = version
    ? versions.find((t) => t.version === version)
    : versions.reduce((a, b) => (b.version > a.version ? b : a))
  if (!type) throw new Error(`Unknown type ${typeId} v${version}`)
  return type
}

const TYPE_ID: Record<Kind, string> = {
  invoice: 'type-invoice',
  receipt: 'type-receipt',
  contract: 'type-contract',
}

export const buildSeedDocuments = (
  suppliers: readonly SeedSupplier[],
  company: { name: string; taxId: string },
): Document[] =>
  PLAN.map((plan, index): Document => {
    const rng = makeRng(5000 + index * 7919)
    const n = String(index + 1).padStart(3, '0')
    const id = `doc-${n}`
    const uploadedMs = BASE_NOW - index * 0.7 * DAY - Math.floor(rng() * 6) * 3_600_000
    const supplier = suppliers[(plan.supplier ?? index) % suppliers.length]
    const fileType: FileType = plan.fileType ?? (plan.kind === 'receipt' ? 'jpg' : 'pdf')
    const stem =
      plan.kind === 'invoice'
        ? `faktura_${firstWord(supplier.name)}`
        : plan.kind === 'contract'
          ? `umowa_${firstWord(supplier.name)}`
          : plan.kind === 'receipt'
            ? 'paragon'
            : 'scan'
    const file = plan.showcase
      ? plan.kind === 'receipt'
        ? { name: 'sample-receipt.jpg', type: fileType, pageCount: 1, url: SAMPLE_JPG_URL }
        : { name: 'sample-invoice.pdf', type: fileType, pageCount: 3, url: SAMPLE_PDF_URL }
      : {
          name: plan.fileName ?? `${stem}_${compactDate(uploadedMs)}_${n}.${fileType}`,
          type: fileType,
          pageCount: fileType === 'pdf' ? 1 + Math.floor(rng() * 3) : 1,
          // the other documents' values don't come from the sample files: they only borrow one to show
          url: fileType === 'pdf' ? SAMPLE_PDF_URL : SAMPLE_JPG_URL,
        }
    const base = { id, file, uploadedAt: new Date(uploadedMs).toISOString(), status: plan.status }

    if (plan.kind === null) {
      return {
        ...base,
        typeId: null,
        typeVersion: null,
        classification: plan.classification === undefined ? null : { confidence: plan.classification },
        values: {},
        overallConfidence: 0,
        ...(plan.status === 'error' && { errorMessage: ERROR_MESSAGES[index - 25] }),
      }
    }

    const review = plan.review ?? false
    const type = findType(TYPE_ID[plan.kind], plan.version)
    const currency = plan.currency ?? CURRENCY_BY_COUNTRY[supplier.country] ?? 'PLN'
    const ctx: Ctx = { rng, id, index, review, supplier, currency: plan.kind === 'receipt' ? 'PLN' : currency, uploadedMs, type }
    const byKey = plan.showcase
      ? plan.kind === 'receipt'
        ? showcaseReceiptValues(id)
        : showcaseInvoiceValues(id)
      : plan.kind === 'invoice'
        ? invoiceValues(ctx, plan.lines ?? 1 + Math.floor(rng() * 5))
        : plan.kind === 'receipt'
          ? receiptValues(ctx)
          : contractValues(ctx, company)
    const values = keyedValues(type, byKey)
    return {
      ...base,
      typeId: type.id,
      typeVersion: type.version,
      classification: { confidence: plan.showcase ? 0.99 : round2(review ? 0.8 + rng() * 0.1 : 0.9 + rng() * 0.09) },
      values,
      overallConfidence: overallConfidence(values),
      ...(plan.status === 'rejected' && { rejectionReason: REJECTION_REASONS[index - 23] }),
    }
  })
