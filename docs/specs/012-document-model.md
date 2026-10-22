# 012 — Document model

**Status:** in-progress · **Depends on:** — · **Route(s):** —

## Goal
The mock layer describes documents of any kind, not just invoices: the user's own document types (a schema of fields) and documents whose values follow that schema. Every later screen builds on these types, so swapping mocks for the real API changes nothing above `src/lib/mock`.

## Scope
- In: types for document types, field definitions, extracted values, pages and OCR tokens; seed templates (Invoice, Receipt, Contract); mock documents across those types; mock API functions; field-type metadata and value formatting.
- Out: the query hooks (002), any UI, real extraction.

## Data
Replaces `Invoice`, `Supplier`, `LineItem`, `ExtractedField<T>` and `INVOICE_STATUSES` in `src/lib/mock/types.ts`. Keeps `Money`, `CurrencyCode`, `CURRENCIES`, `Company`, `TeamMember`, export types.

Sketch (final names are decided in slice 1):

```ts
export const FIELD_TYPES = ['text', 'number', 'money', 'date', 'boolean', 'select', 'email', 'phone', 'tax_id', 'table'] as const
export type FieldType = (typeof FIELD_TYPES)[number]
export type ScalarFieldType = Exclude<FieldType, 'table'>

/** Normalized to the page after rotation: 0..1, origin top-left. */
export interface BBox { x: number; y: number; w: number; h: number }

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
  columns?: FieldDef[]
  /** can be used for grouping (spec 010) */
  groupable?: boolean
  examples: FieldExample[]
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

export const DOCUMENT_STATUSES = ['uploaded', 'processing', 'unclassified', 'needs_review', 'approved', 'exported', 'rejected', 'error'] as const

interface FieldValueMap { text: string; number: number; money: Money; date: string; boolean: boolean; select: string; email: string; phone: string; tax_id: string }

export interface ExtractedValue<T extends ScalarFieldType = ScalarFieldType> {
  type: T
  value: FieldValueMap[T] | null
  /** 0..1; 1 once a person has edited or confirmed it */
  confidence: number
  source?: { page: number; bbox: BBox }
}
export interface TableValue { type: 'table'; rows: { id: string; cells: Record<string, ExtractedValue> }[] }

export interface Token { id: string; text: string; bbox: BBox }
export interface DocumentPage { index: number; width: number; height: number; imageUrl?: string; tokens: Token[] }

export interface Document {
  id: string
  file: { name: string; type: FileType; pageCount: number; url: string }
  uploadedAt: string
  status: DocumentStatus
  typeId: string | null
  typeVersion: number | null
  classification: { confidence: number } | null
  values: Record<string, ExtractedValue | TableValue>
  overallConfidence: number
  errorMessage?: string
  rejectionReason?: string
}
```

## Slices

### [x] 1. Schema types + templates
- **Build:** the type, field and value types above, plus `DOCUMENT_TEMPLATES`: Invoice (the current invoice fields, line items as a `table` field, supplier marked `groupable`), Receipt and Contract.
- **Files:** `src/lib/mock/types.ts`, `src/lib/mock/templates.ts`
- **Accept:**
  - [x] `ExtractedValue<'money'>['value']` is `Money | null`, so the compiler catches a mismatched value type (no casts)
  - [x] every template field has a `hint`; the keys are unique within each type

### [x] 2. Mock documents + pages
- **Build:** first update the templates per **Decisions**: drop the Invoice `currency` field; Contract `parties` becomes a `table` (columns `name`: text, `tax_id`: tax_id). Then about 25 documents across the three types in every status, including `unclassified`, with long values and one invoice with 50+ table rows. Pages carry tokens. One generated sample PDF (no real data) plus a JPG scan in `public/mock/`, each with a hand-made token JSON that lines up with the file.
- **Files:** `src/lib/mock/templates.ts`, `src/lib/mock/data.ts`, `src/lib/mock/pages.ts`, `public/mock/*`
- **Accept:**
  - [x] each document's `values` match its type's fields by id and value type, including table cells against their column's type (checked at runtime: the types can't tie a value to its field id)
  - [x] the money values within one invoice share one currency
  - [x] the sample PDF includes one rotated page (`rotate: 90`) for spec 013

### [ ] 3. Mock API
- **Build:** replace the invoice and supplier functions with: `listDocumentTypes`, `getDocumentType(id, version?)` (old versions stay readable; omitted means current), `createDocumentType`, `updateDocumentType` (raises `version`, keeps the previous one), `listTemplates` (server-provided), `listDocuments({ typeId, status, search, group })`, `getDocument`, `getDocumentPages`, `updateDocumentValues`, `approveDocuments`, `rejectDocument`, `reassignDocumentType`, `uploadDocument`, `proposeFields`, `testExtract`, `addFieldExample`, `listGroupValues`. Keep the export, company and team functions, with export jobs taking a `typeId`.
- **Files:** `src/lib/mock/api.ts`
- **Accept:**
  - [ ] the comment block at the top of `api.ts` lists what the backend must provide
  - [ ] `uploadDocument` moves through `uploaded → processing → needs_review | unclassified` with fake latency

### [ ] 4. Field-type metadata + formatting
- **Build:** `FIELD_TYPE_META` (label, lucide icon, empty value, whether it can be grouped) and `formatFieldValue(value)` using `formatMoney`/`formatDate`.
- **Files:** `src/lib/fields/field-meta.ts`, `src/lib/fields/format-field-value.ts`
- **Accept:**
  - [ ] every `switch` over `FieldType` ends with a `never` check
  - [ ] null shows as "—"; money always shows its currency

### [ ] 5. Existing code follows the model
- **Build:** move the code that already uses the invoice model to documents: `StatusBadge` (new `unclassified` status), `ConfidenceBadge`, the `/design` page demos, the header search ("Search documents…"), the nav (Inbox, Upload, Types, Groups, Export, Settings), and the router placeholders (`/types`, `/types/new`, `/types/:typeId`, `/documents/:documentId`, `/groups`, `/groups/:typeId/:fieldId` instead of `/invoices/:id` and `/suppliers/*`).
- **Files:** `src/components/domain/`, `src/components/layout/{header.tsx,nav-items.ts}`, `src/pages/design-page.tsx` (or `design/` after 001), `src/app/router.tsx`
- **Accept:**
  - [ ] `grep -rni "invoice\|supplier" src` only hits the Invoice template and mock data
  - [ ] every new route renders its placeholder; typecheck, lint and build green

## Backend needs
Storage for document types with every version kept and readable; documents linked to a type version; templates served by the API (editable without a frontend deploy); page images or the source file per page; OCR tokens with normalized bboxes for PDFs, scans and photos.

## Decisions
- **Type versions:** old versions stay readable. A document is shown with the fields of the version it was extracted with (`typeVersion`); re-extracting with the current version is offered separately (008/014).
- **Templates** live on the server and come through `listTemplates`. `templates.ts` is only the mock's seed.
- **Invoice currency:** no separate `currency` field; the currency comes from the `money` values themselves.
- **Contract parties:** a `table` (name, tax ID), not comma-separated text. No new field type.

## Open questions
- Only two documents are really backed by their file: `doc-001` (`sample-invoice.pdf`) and `doc-002` (`sample-receipt.jpg`), with `source` bboxes on their values. The other documents point `file.url` at the sample of their kind and carry no `source`, so the file shown doesn't match their values. Is that enough for 008/013, or does each type need its own sample file?
- Templates have no `required` option for table fields (`makeTable` always sets `false`), so Contract `parties` lost the `required` it had as a text field.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | 1 | done | New schema types (`FieldDef`, `ColumnDef`, `DocumentType`, `AnyExtractedValue`/`FieldValue`, `Document`, …) added beside the legacy invoice types, which are marked `@deprecated` until slices 2/3/5 migrate their users. `DOCUMENT_TEMPLATES` (Invoice, Receipt, Contract). `lib/mock/types.ts`, `lib/mock/templates.ts`, `lib/mock/index.ts` |
| 2026-10-22 | 2 | done | Templates updated per Decisions. 27 seed documents (every status, Invoice v1 and v2, 64-row invoice, PLN/EUR/GBP/USD); `findValueMismatches` returns 0 and runs over the seeds in dev. Sample PDF (3 pages, page 2 `/Rotate 90`) and receipt JPG with token JSON, generated by `scripts/generate-mock-files.py`; token alignment spot-checked against the rendered pages. Legacy invoice seeds stay, deprecated, until slice 3. `lib/mock/{data,templates,pages,document-types-seed,documents-seed,value-builders,value-check,seed-utils,showcase-sources}.ts`, `public/mock/*`, `scripts/generate-mock-files.py` |
