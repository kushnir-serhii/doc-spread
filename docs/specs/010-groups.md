# 010 — Groups

**Status:** ready · **Depends on:** 002, 014 · **Route(s):** `/groups`, `/groups/:typeId/:fieldId`

## Goal
The user sees their documents grouped by any field marked `groupable` (a supplier, a client, an employee), with the document count and totals for each value, and can open the documents behind one value. This replaces the invoice-only Suppliers screen.

## Scope
- In: the list of groupings (each groupable field of each type), the values of one grouping with counts and totals, the documents of one value (reusing the Inbox list).
- Out: merging or renaming values by hand, groups that span several types, sorting by column, pagination, server-side value search, a status filter inside a value.

## Data
`DocumentType`, `FieldDef.groupable`, `useDocumentTypes()`, `useGroupings()` (new), `useGroupValues(typeId, fieldId)` (extended with totals), `useDocuments({ typeId, group: { fieldId, value } })`, `InboxResults` / `DocumentList` (006).

Shared rules for all slices:
- **Counted documents:** every document of the type except `rejected` (so needs review, approved, exported). Counts, last document date and totals all use this set.
- **Total fields:** the type's top-level money fields that are among its `listColumnIds`, in list-column order (Invoice → Gross total, Receipt → Total, Contract → none). A type with none shows no totals.
- **Totals:** per money field, one amount per currency (minor units), sorted by currency code; empty values are skipped. Shown one line per currency through `formatMoney`, `tabular-nums`, right-aligned in tables.
- **Matching:** exact after normalization: trim, lowercase, and runs of whitespace collapsed to one space (mock). Display form = the first occurrence.
- **Last document:** the newest `uploadedAt` among the counted documents.

## Slices

### [ ] 1. Groupings list
- **Build:** mock `listGroupings()` + `useGroupings()` (key from `groupKeys`), `GroupingSummary` type; whitespace collapse in the mock `normalize`; `/groups` page with one card per groupable field.
- **Files:** `src/lib/mock/api.ts`, `src/lib/mock/types.ts`, `src/lib/mock/index.ts`, `src/lib/api/groups.ts`, `src/pages/groups/groups-page.tsx`, `src/features/groups/`, `src/app/router.tsx`
- **Accept:**
  - [ ] one card per groupable field, ordered by type then field order: title = field label ("Supplier"), a line with the type name ("Invoice"), and "8 values · 14 documents" (singular forms for 1); a grouping without documents reads "No values yet"
  - [ ] the card is a link to `/groups/:typeId/:fieldId`, 44px target, visible focus
  - [ ] empty state (no groupable fields) explains how to mark a field as groupable ("Group documents by this field" in the type builder), with a link to `/types`
  - [ ] loading skeleton, error with retry, long labels truncate with a title; works at 375px
  - [ ] the sidebar keeps one "Groups" item

### [ ] 2. Values of a grouping
- **Build:** `GroupValue` gains `totals`; `/groups/:typeId/:fieldId` page with a values table (cards below `md`) and search.
- **Files:** `src/lib/mock/api.ts`, `src/lib/mock/types.ts`, `src/pages/groups/group-page.tsx`, `src/features/groups/`, `src/app/router.tsx`
- **Accept:**
  - [ ] header "Supplier · Invoice" with a back link to `/groups`
  - [ ] columns: Value, Documents, Last document, then one column per total field (header = field label) with one line per currency; sorted by count descending
  - [ ] each value links to `?value=<value>` (keeping `?q=`)
  - [ ] search in `?q=` (debounced like Inbox, case-insensitive substring, filtered in the browser); no matches shows "No values match" with a clear action
  - [ ] loading skeleton, empty (no documents yet, with a link to Upload), error with retry, long values truncate with a title; table from `md`, stacked cards below
  - [ ] an unknown type, an unknown field or a field that isn't groupable shows not-found (checked before the request) with a link back to `/groups`

### [ ] 3. Documents of a value
- **Build:** `?value=` on the grouping page switches to the value's documents.
- **Files:** `src/pages/groups/group-page.tsx`, `src/features/groups/`
- **Accept:**
  - [ ] `?value=` lists the value's documents (all counted and rejected ones, via `useDocuments({ typeId, group })`) with `InboxResults`: the type's columns plus Status, selection, bulk Approve and Export for this type
  - [ ] the header shows the value, the document count and its totals, taken from the matching `useGroupValues` row; a back link returns to the values list keeping `?q=`
  - [ ] a value with no counted documents (stale link) shows "No documents for ‘X’ any more" with a link back to the values
  - [ ] loading, error with retry, long value in the header wraps

## Backend needs
- Group listing per (type, field): value, document count, last document date, totals per money field and currency, over non-rejected documents; a summary per groupable field (value count, document count) for the groupings list.
- Value normalization (case, spacing, legal-form suffixes such as "Sp. z o.o."), grouping by tax ID where one exists, and fuzzy matching later.
- Server-side search and pagination of group values.

## Open questions
- **Decided:** the sidebar shows "Groups" as one item; individual groupings are not pinned.
- **Decided:** MVP matching is exact after normalization (trim, lowercase, collapsed spaces); suffixes, tax ID and fuzzy matching are backend work.
- **Decided:** rejected documents are excluded from counts and totals; totals only for money fields that are list columns.
- **Decided:** card copy avoids pluralizing type names (field label as title, type name beneath).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | Suppliers → generic groups by any groupable field |
| 2026-10-26 | — | ready | questions answered (all recommended); decisions written into the criteria |
