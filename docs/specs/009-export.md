# 009 — Export

**Status:** done · **Depends on:** 002, 006 · **Route(s):** `/export`

## Goal
The user turns approved documents of one type into a spreadsheet (or a PDF bundle), with the columns they need, and downloads it or emails it. They can see past exports.

## Scope
- In: pick a type and its approved documents (preselected from `?type=&ids=`); column mapping (include, order, header name), saved per type; how table fields are exported; format (CSV / XLSX / PDF bundle); destination (download or email); export history.
- Out: scheduled exports, integrations with other software, exporting several types in one file.

## Data
`ExportFormat`, `ExportDestination`, `ExportJob` (with `typeId` and `columns`), `useDocumentType(id)`, `useDocuments({ typeId, status: 'approved' })`, `useCreateExportJob()`, `useExportJobs()`, `useCompany()` for the saved recipients.

## Slices

### [x] 1. Type + selection + options
- **Files:** `src/pages/export/`, `src/features/export/`
- **Accept:**
  - [x] a type select; the approved documents of that type listed with selection; `?ids=` preselects them
  - [x] the format and destination are radio groups with labels; email offers the saved recipients from Settings
  - [x] an empty state when nothing of that type is approved

### [x] 2. Column mapping
- **Accept:**
  - [x] a list of the type's fields with an include checkbox, a header-name input (the field key by default) and up/down reordering
  - [x] table fields offer: XLSX → a separate sheet linked by a document id column; CSV → a separate file in a zip, or one row per table row (the header values repeated)
  - [x] the mapping is saved per type and restored next time; a preview shows the first 3 rows

### [x] 3. Create export
- **Accept:**
  - [x] the submit summary shows the count, the money totals per currency (for each money column) and the destination
  - [x] pending, success (announced) and error with retry; exported documents leave the approved list

### [x] 4. History
- **Accept:**
  - [x] a table of jobs with date, type, format, count, destination and status badge; empty state

## Backend needs
Export job creation with a column mapping, file generation (CSV, XLSX with several sheets, a PDF bundle), email delivery, job status, download URL; storing the mapping per type; the company's saved export recipients (`recipients`).

## Open questions
- **Decided (2026-10-26):** a saved column mapping belongs to the type and is shared by the team, not kept per user.
- **Decided (2026-10-26):** the export fields go into the 012 model. `ExportJob` gets `columns` (the mapping used for that job), and the per-type mapping is stored next to the type. `exported` already exists in `DOCUMENT_STATUSES`, and the mock `createExportJob` already moves approved documents to it, so slice 3 only has to refresh the approved list.
- **Decided (2026-10-26):** the branch starts from 016, so computed fields are exported like any other field.
- **Decided (2026-10-26):** recipients — the mock `Company` gets `recipients: { id, name, email }[]` (the seed has the accountant). Export offers a saved recipient or "Other address" with email validation. Editing the list is 011.
- **Decided (2026-10-26):** the type is in the URL (`?type=`); the document selection is local. Without `?ids=` every approved document of the type is selected. The page has tabs "New export" and "History" (`?tab=`).
- **Decided (2026-10-26):** the page works at 375px; the column mapping is desktop-first.
- **Decided (2026-10-26):** slice 2 — values are machine-readable: ISO dates, a dot as the decimal separator, money split into two columns `<header>` (the amount) and `<header>_currency`, booleans as true/false.
- **Decided (2026-10-26):** optional built-in columns "Document ID" and "File name" at the top of the list, off by default. Document ID is forced on when a table goes to a separate sheet or file.
- **Decided (2026-10-26):** CSV "one row per table row" is allowed for one table only (two would multiply rows); the other tables go to separate files in the zip.
- **Decided (2026-10-26):** for the PDF bundle the mapping is hidden, with a note that the file holds the original documents, not columns.
- **Decided (2026-10-26):** the mapping is saved for the type when an export is created and restored next time; "Reset to default"; no separate "Save mapping" button. New fields of the type are added at the end, included; deleted fields drop out.
- **Decided (2026-10-26):** slices 3–4 — the mock generates a real CSV for a CSV export that is one file. XLSX, zip and PDF can only be made by the backend, so the success state says so honestly (Download is unavailable, with the reason). No libraries are added.
- **Decided (2026-10-26):** if `?ids=` is given but none of them is approved for that type, every approved document is selected, as without `?ids=`.
- **Decided (2026-10-26):** no retry for failed jobs in History (out of scope); only the status badge.
- Open: table columns keep their keys as headers in a separate sheet/file or a flattened table; a per-column mapping for line items may be needed (import templates often fix those headers).
- Open: money is exported with 2 decimals (as `formatMoney`); a currency with other minor units would need `export-cells.ts` changed.
- Open: document types have no key, so the CSV file name uses a slug of the type name.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | export per type, column mapping, table fields |
| 2026-10-26 | 1 | done | `/export` page: type select with approved counts (`?type=`), approved documents with selection (`?ids=` preselects, otherwise all), format and destination radio groups, saved recipients or another address; empty, not-found, loading and error states. `pages/export/export-page.tsx`, `features/export/*`, `router.tsx`, `Company.recipients` in `lib/mock/{types,data}.ts`, `use-selection.ts` takes initial ids |
| 2026-10-26 | 2 | done | column mapping: built-in Document ID / File name, include, header, up/down, Reset to default; table modes per format (XLSX sheet, CSV zip file or one row per table row, one table only), Document ID forced for separate tables; unique non-empty headers incl. `_currency`; PDF note; preview of the first 3 rows. Mapping model + `getExportMapping` / `useExportMapping`; `createExportJob` saves the mapping it gets (wired to Submit in slice 3). Computed fields are computed at export time when not stored. `features/export/{export-form-body,column-mapping,column-row,table-mode-control,mapping-preview,export-cells,export-plan,export-header-errors}`, `lib/fields/export-mapping.ts`, `lib/mock/{types,api,data}.ts`, `lib/api/export.ts` |
| 2026-10-26 | 3 | done | summary (count, money totals per currency per money column, format, destination), blocked submit focuses the first problem, pending / error with retry / announced success panel; a real RFC 4180 CSV (BOM, CRLF) for a one-file CSV download, an honest "generated on the server" note for XLSX, zip and PDF; exported documents leave the approved list. `features/export/{build-csv,download-csv,export-summary,export-result,submit-summary,export-submit,export-success}`, `export-page.tsx`, `export-form*.tsx`, destination/recipient inputs |
| 2026-10-26 | 4 | done | tabs New export / History (`?tab=history`, keyboard tabs); history table (cards below md) with date, type, format, count, destination, status badge with icon; skeleton, error with retry, empty state. `features/export/{export-tabs,export-tab-ids,export-history,history-table,history-cards,history-job,history-skeleton,history-empty,export-status-badge}`, `export-page.tsx` |
