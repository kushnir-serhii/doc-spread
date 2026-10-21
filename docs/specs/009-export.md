# 009 — Export

**Status:** draft · **Depends on:** 002, 006 · **Route(s):** `/export`

## Goal
The user sends approved invoices to the accountant, or downloads them, in the format the accountant needs, and can see past exports.

## Scope
- In: pick approved invoices (preselected from `?ids=`), format (CSV / XLSX / PDF bundle), destination (download or email the accountant), export history.
- Out: scheduled exports, accounting-software integrations.

## Data
`ExportFormat`, `ExportDestination`, `ExportJob`, `useInvoices({ status: 'approved' })`, `useCreateExportJob()`, `useExportJobs()`, `useCompany()` for the accountant email.

## Slices

### [ ] 1. Selection + options
- **Files:** `src/pages/export/`, `src/features/export/`
- **Accept:**
  - [ ] approved invoices listed with selection; `?ids=` preselects them
  - [ ] the format and destination are radio groups with labels; email defaults to the accountant's address
  - [ ] empty state when there's nothing approved

### [ ] 2. Create export
- **Accept:**
  - [ ] the submit summary shows the count, total per currency and the destination
  - [ ] pending, success (announced) and error with retry; exported invoices leave the approved list

### [ ] 3. History
- **Accept:**
  - [ ] a table of jobs with date, format, count, destination and status badge; empty state

## Backend needs
Export job creation, file generation, email delivery, job status, download URL.

## Open questions
- Which CSV/XLSX column layout does the accountant expect?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
