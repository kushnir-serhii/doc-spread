# 008 — Review (core screen)

**Status:** draft · **Depends on:** 002, 006 · **Route(s):** `/invoices/:invoiceId`

## Goal
The user checks the AI-extracted fields against the document, fixes the low-confidence ones, and approves fast, mostly from the keyboard.

## Scope
- In: document preview on the left, extracted fields on the right (supplier, NIP/VAT ID, number, issue/sale/due dates, currency, net/VAT/gross, line items), per-field confidence, low-confidence highlight, approve / reject (with reason) / save draft, keyboard shortcuts, next invoice.
- Out: rendering the real PDF (a mock preview is fine), audit history, comments.

## Data
`Invoice`, `ExtractedField<T>`, `LineItem`, `confidenceLevel`, `useInvoice(id)`, `useUpdateInvoice()`, `useApproveInvoices()`, `useRejectInvoice()`, `useInvoices({ status: 'needs_review' })` for "next".

## Slices

### [ ] 1. Layout + read-only fields
- **Files:** `src/pages/review/`, `src/features/invoices/review/`
- **Accept:**
  - [ ] two resizable/fixed panes on desktop; stacked on mobile (preview collapsible)
  - [ ] every field shows its value and a confidence badge; null shows "Not found"
  - [ ] skeleton, not-found invoice, and error states

### [ ] 2. Editable fields + draft
- **Build:** a form over the header fields. Edited values reset confidence to "verified". Save draft goes through `useUpdateInvoice()`.
- **Accept:**
  - [ ] low-confidence fields are highlighted with a token color and an icon (not color alone)
  - [ ] money inputs edit in major units and are stored as minor units; currency is always shown
  - [ ] leaving with unsaved changes asks for confirmation (`useBlocker`)

### [ ] 3. Line items
- **Accept:**
  - [ ] table of line items with net/VAT/gross; totals row; a mismatch with the header totals is flagged
  - [ ] 50+ line items stay usable (sticky header, contained scroll)

### [ ] 4. Approve / reject / next
- **Accept:**
  - [ ] Approve is blocked while required fields are empty, and says which ones
  - [ ] Reject opens a dialog with a required reason
  - [ ] after an action: go to the next `needs_review` invoice, or back to the Inbox with a message if none are left

### [ ] 5. Keyboard
- **Accept:**
  - [ ] shortcuts: next/previous field, approve, next invoice; they don't fire while typing in a text input unless a modifier is used
  - [ ] a "?" help dialog lists them; all of them work with a screen reader running

## Backend needs
Document preview URL per page; field-level confidence; validation for approval (required fields, totals consistency, NIP checksum).

## Open questions
- Exact key bindings (e.g. `J/K`, `Ctrl+Enter` to approve)?
- Is editing a line item in scope for the MVP, or view only?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
