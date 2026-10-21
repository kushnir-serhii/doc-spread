# 010 — Suppliers

**Status:** draft · **Depends on:** 002 · **Route(s):** `/suppliers`, `/suppliers/:supplierId`

## Goal
The user sees everyone who sends them invoices, and each supplier's invoices.

## Scope
- In: supplier list with search; detail with company data and their invoices (reusing the Inbox table).
- Out: editing or merging suppliers.

## Data
`Supplier`, `SupplierWithInvoices`, `useSuppliers()`, `useSupplier(id)`.

## Slices

### [ ] 1. List
- **Files:** `src/pages/suppliers/`, `src/features/suppliers/`
- **Accept:**
  - [ ] name, tax ID and country; search in `?q=`; loading, empty and error states

### [ ] 2. Detail
- **Accept:**
  - [ ] header with the supplier's data; their invoices in the shared `InvoiceTable`
  - [ ] not-found state for an unknown id

## Backend needs
Supplier list with search; supplier detail including invoice counts and totals.

## Open questions
- Show totals per supplier (sum per currency)?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
