# 010 — Groups

**Status:** draft · **Depends on:** 002, 014 · **Route(s):** `/groups`, `/groups/:typeId/:fieldId`

## Goal
The user sees their documents grouped by any field marked `groupable` (a supplier, a client, an employee), with the document count and totals for each value, and can open the documents behind one value. This replaces the invoice-only Suppliers screen.

## Scope
- In: the list of groupings (each groupable field of each type), the values of one grouping with counts and totals, the documents of one value (reusing the Inbox table).
- Out: merging or renaming values by hand, groups that span several types.

## Data
`DocumentType`, `FieldDef.groupable`, `useDocumentTypes()`, `useGroupValues(typeId, fieldId)`, `useDocuments({ typeId, group: { fieldId, value } })`, `DocumentTable` (006).

## Slices

### [ ] 1. Groupings list
- **Files:** `src/pages/groups/`, `src/features/groups/`
- **Accept:**
  - [ ] one card per groupable field: "Invoices by Supplier", with the number of distinct values
  - [ ] empty state explains how to mark a field as groupable, with a link to the builder (014)

### [ ] 2. Values of a grouping
- **Accept:**
  - [ ] a table of values with the document count, the last document date and the totals per currency for each money field; search in `?q=`
  - [ ] loading, empty, error and long-value states; an unknown type or field shows not-found

### [ ] 3. Documents of a value
- **Accept:**
  - [ ] `?value=` opens the value's documents in the shared `DocumentTable` with the type's columns; the header shows the value and its totals

## Backend needs
Group values per (type, field) with counts and totals; value normalization (case, spacing, legal-form suffixes such as "Sp. z o.o."), and grouping by tax ID where one exists.

## Open questions
- Should the sidebar show "Groups" as one item, or pin individual groupings?
- How exact must matching be in the MVP: exact after normalization, or fuzzy?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | Suppliers → generic groups by any groupable field |
