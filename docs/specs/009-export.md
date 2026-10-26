# 009 — Export

**Status:** ready · **Depends on:** 002, 006 · **Route(s):** `/export`

## Goal
The user turns approved documents of one type into a spreadsheet (or a PDF bundle), with the columns they need, and downloads it or emails it. They can see past exports.

## Scope
- In: pick a type and its approved documents (preselected from `?type=&ids=`); column mapping (include, order, header name), saved per type; how table fields are exported; format (CSV / XLSX / PDF bundle); destination (download or email); export history.
- Out: scheduled exports, integrations with other software, exporting several types in one file.

## Data
`ExportFormat`, `ExportDestination`, `ExportJob` (with `typeId` and `columns`), `useDocumentType(id)`, `useDocuments({ typeId, status: 'approved' })`, `useCreateExportJob()`, `useExportJobs()`, `useCompany()` for the saved recipients.

## Slices

### [ ] 1. Type + selection + options
- **Files:** `src/pages/export/`, `src/features/export/`
- **Accept:**
  - [ ] a type select; the approved documents of that type listed with selection; `?ids=` preselects them
  - [ ] the format and destination are radio groups with labels; email offers the saved recipients from Settings
  - [ ] an empty state when nothing of that type is approved

### [ ] 2. Column mapping
- **Accept:**
  - [ ] a list of the type's fields with an include checkbox, a header-name input (the field key by default) and up/down reordering
  - [ ] table fields offer: XLSX → a separate sheet linked by a document id column; CSV → a separate file in a zip, or one row per table row (the header values repeated)
  - [ ] the mapping is saved per type and restored next time; a preview shows the first 3 rows

### [ ] 3. Create export
- **Accept:**
  - [ ] the submit summary shows the count, the money totals per currency (for each money column) and the destination
  - [ ] pending, success (announced) and error with retry; exported documents leave the approved list

### [ ] 4. History
- **Accept:**
  - [ ] a table of jobs with date, type, format, count, destination and status badge; empty state

## Backend needs
Export job creation with a column mapping, file generation (CSV, XLSX with several sheets, a PDF bundle), email delivery, job status, download URL; storing the mapping per type.

## Open questions
- **Decided (2026-10-26):** a saved column mapping belongs to the type and is shared by the team, not kept per user.
- **Decided (2026-10-26):** the export fields go into the 012 model. `ExportJob` gets `columns` (the mapping used for that job), and the per-type mapping is stored next to the type. `exported` already exists in `DOCUMENT_STATUSES`, and the mock `createExportJob` already moves approved documents to it, so slice 3 only has to refresh the approved list.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | export per type, column mapping, table fields |
