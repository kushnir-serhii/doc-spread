# 006 — Inbox (dashboard)

**Status:** draft · **Depends on:** 002 · **Route(s):** `/inbox`

## Goal
The user sees every invoice with its status and AI confidence, finds one quickly, and approves or exports in bulk.

## Scope
- In: table (supplier, number, date, amount, status, confidence), status filter, search, row selection, bulk approve, bulk export (links to Export with the selection), mobile card layout.
- Out: pagination on the server, saved views, column customization.

## Data
`Invoice`, `INVOICE_STATUSES`, `useInvoices({ status, search })`, `useApproveInvoices()`, `StatusBadge`, `ConfidenceBadge`, `formatMoney`, `formatDate`.

## Slices

### [ ] 1. Table with real states
- **Build:** add shadcn `table` and `skeleton`. Invoice table with the six columns; a row click opens `/invoices/:id`.
- **Files:** `src/pages/inbox/`, `src/features/invoices/invoice-table.tsx`
- **Accept:**
  - [ ] skeleton while pending; error with retry; empty state with a CTA to `/upload`
  - [ ] amounts right-aligned, `tabular-nums`, with currency; null extracted values shown as "—"
  - [ ] long supplier names are truncated with the full name in a `title`

### [ ] 2. Filter + search in the URL
- **Accept:**
  - [ ] status tabs/select and the search input sync to `?status=&q=`; a reload keeps them
  - [ ] search is debounced (~250 ms); a "no results" state differs from "no invoices yet"

### [ ] 3. Selection + bulk approve
- **Accept:**
  - [ ] checkbox per row plus select-all (with an indeterminate state); every checkbox is labelled
  - [ ] the bulk bar shows the count; Approve only applies to `needs_review` rows and says how many are skipped
  - [ ] after a success: the selection clears and a toast/status message is announced

### [ ] 4. Bulk export + mobile
- **Accept:**
  - [ ] Export navigates to `/export?ids=…` with the selected approved invoices
  - [ ] at 375px rows render as cards and the bulk bar is sticky at the bottom with 44px targets

## Backend needs
List endpoint with status filter, full-text search, sort, cursor pagination; bulk approve returning the per-id result.

## Open questions
- Default sort: upload date or issue date?
- Which statuses count as "needs attention" for a badge in the sidebar?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
