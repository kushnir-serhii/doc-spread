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

### [ ] 2. Mock documents + pages
- **Build:** about 25 documents across the three types in every status, including `unclassified`, with long values and one invoice with 50+ table rows. Pages carry tokens. One generated sample PDF (no real data) plus a JPG scan in `public/mock/`, each with a hand-made token JSON that lines up with the file.
- **Files:** `src/lib/mock/data.ts`, `src/lib/mock/pages.ts`, `public/mock/*`
- **Accept:**
  - [ ] each document's `values` match its type's fields by id and value type
  - [ ] the sample PDF includes one rotated page (`rotate: 90`) for spec 013

### [ ] 3. Mock API
- **Build:** replace the invoice and supplier functions with: `listDocumentTypes`, `getDocumentType`, `createDocumentType`, `updateDocumentType` (raises `version`), `listTemplates`, `listDocuments({ typeId, status, search, group })`, `getDocument`, `getDocumentPages`, `updateDocumentValues`, `approveDocuments`, `rejectDocument`, `reassignDocumentType`, `uploadDocument`, `proposeFields`, `testExtract`, `addFieldExample`, `listGroupValues`. Keep the export, company and team functions, with export jobs taking a `typeId`.
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
Storage for document types with versions; documents linked to a type version; page images or the source file per page; OCR tokens with normalized bboxes for PDFs, scans and photos.

## Open questions
- Should a type's old versions stay readable (show a document with the fields it was extracted with), or only the current one?
- Do templates live on the server (editable by us without a deploy) or ship in the frontend?
- Invoice has a `currency` select field while each `money` value carries its own currency, so the two can disagree. Keep the field (for export/filtering) or derive it from the totals?
- Nothing in the types ties a table cell's `type` to its column's declared type; slice 2's check that values match fields has to cover table cells too.
- Contract `parties` is a comma-separated `text` because there is no list field type. Is that enough, or does a list type belong in 014?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | 1 | done | New schema types (`FieldDef`, `ColumnDef`, `DocumentType`, `AnyExtractedValue`/`FieldValue`, `Document`, …) added beside the legacy invoice types, which are marked `@deprecated` until slices 2/3/5 migrate their users. `DOCUMENT_TEMPLATES` (Invoice, Receipt, Contract). `lib/mock/types.ts`, `lib/mock/templates.ts`, `lib/mock/index.ts` |
