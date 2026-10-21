# 002 — Query layer (lib/api)

**Status:** ready · **Depends on:** — · **Route(s):** —

## Goal
Screens get data only through typed TanStack Query hooks, so swapping the mocks for the real API later means changing `src/lib/api` and nothing else.

## Scope
- In: query-key factories, query and mutation hooks wrapping every function in `src/lib/mock/api.ts`, invalidation rules.
- Out: the real HTTP client, auth.

## Data
`listInvoices`, `getInvoice`, `updateInvoice`, `approveInvoices`, `rejectInvoice`, `listSuppliers`, `getSupplier`, `listExportJobs`, `createExportJob`, `getCompany`, `updateCompany`, `listTeam`.

## Slices

### [ ] 1. Invoices
- **Build:** `invoiceKeys` factory; `useInvoices(params)`, `useInvoice(id)`, `useUpdateInvoice()`, `useApproveInvoices()`, `useRejectInvoice()`. Mutations invalidate lists and update the affected detail.
- **Files:** `src/lib/api/invoices.ts`, `src/lib/api/index.ts`
- **Accept:**
  - [ ] no inline query keys; return types are inferred from the mocks (no manual generics)
  - [ ] approving invalidates every `invoiceKeys.list(*)`

### [ ] 2. Suppliers, export, company, team
- **Build:** the same pattern for `supplierKeys`, `exportKeys`, `companyKeys`, `teamKeys`. `useCreateExportJob()` also invalidates invoices, because exporting changes their status.
- **Files:** `src/lib/api/{suppliers,export,company,team}.ts`
- **Accept:**
  - [ ] every mock function has exactly one hook
  - [ ] `grep "@/lib/mock" src --include=*.tsx` only hits type imports and formatters

## Backend needs
Mirrors the comment block at the top of `src/lib/mock/api.ts`.

## Open questions
- Should `formatMoney`/`formatDate` move from `lib/mock` to `lib/format.ts`, since they aren't mocks?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
