# 018 — Export: table column mapping

**Status:** done · **Depends on:** 009 · **Route(s):** `/export`

## Goal
The user maps the columns of table fields (line items) in an export the same way as document fields: include, header name, order — so the file matches an accountant's import template.

## Scope
- In: per-column include, header and order for each table field, in both a separate sheet/file and the flattened mode; saved with the type's export mapping; computed columns (017) exported like any column; a preview of the flattened file and of every separate sheet/file.
- Out: per-column transforms or formulas; money totals for table columns in the submit summary (they stay document-level); generating XLSX or zip files in the mock (009: backend only).

## Data
Extends `ExportColumnMapping` (009) with per-table column lists:

```ts
/** One column of a table field in the export, in output order. */
export interface ExportTableColumn {
  columnId: string
  include: boolean
  /** used as typed, in a separate sheet/file and in the flattened file alike */
  header: string
}

export interface ExportColumnMapping {
  columns: ExportColumn[]
  tables: Record<string, TableExportMode>
  /** table field id -> its columns in output order; missing for mappings saved before 018 */
  tableColumns?: Record<string, ExportTableColumn[]>
}
```

Defaults: every column included, header = the column key, type order. Restore: saved order, headers and include are kept; new columns go last (included); deleted columns and tables drop out; a table with no saved list gets the defaults.

## Slices

### [x] 1. Table columns in the mapping + flattened CSV
- **Build:** the data above, defaults and restore in `export-mapping.ts` ("Reset to default" resets table columns too). Under an included table field's row in the mapping, a collapsed disclosure "Columns (5 of 6)" opens a nested list: include checkbox, header input, up/down (order within the table only), the column's type, and "Computed" for a computed column (017). The flattened CSV uses the column headers as typed (no table prefix), in that order, only the included ones; money columns split into `<header>` and `<header>_currency`. Computed cells that aren't stored are computed at export time (`applyComputedCells`), like computed fields.
- **Files:** `src/lib/mock/types.ts`, `src/lib/fields/export-mapping.ts`, `src/features/export/{column-mapping,column-row,export-plan,export-header-errors,export-submit}.tsx/ts`, new `src/features/export/table-column-list.tsx`
- **Accept:**
  - [x] each table field has its column list with include, header (column key by default) and up/down; collapsed by default, the toggle says "Columns (n of m)" and is keyboard-operable with `aria-expanded`
  - [x] the mapping with `tableColumns` is saved with the export and restored next time; new columns are added last, deleted ones drop out; a mapping saved before 018 gets the defaults; Reset to default resets the columns
  - [x] the flattened CSV and its preview use the included columns in the mapped order under their headers as typed; computed columns are filled even when not stored
  - [x] an included table with no included column shows "Pick at least one column, or untick the table." and blocks Submit (focus goes to it); an empty or duplicate column header is an inline error on that column row (duplicates count against the main file in flatten mode) and blocks Submit
  - [x] works at 375px (rows stack), in both themes; long labels truncate with a title

### [x] 2. Separate sheets and files
- **Build:** a plan per separate table: the Document ID column first (under the main mapping's Document ID header), then the included columns in order under their headers. Headers must be unique within that sheet/file. The preview shows each separate sheet/file as a small table (the first 5 rows from the first 3 selected documents) under its name, with the existing "N rows from M documents" line.
- **Files:** `src/features/export/{export-plan,export-header-errors,mapping-preview}.tsx/ts`, new `src/features/export/separate-table-preview.tsx`
- **Accept:**
  - [x] XLSX and CSV-zip previews show each separate table with Document ID + the mapped columns (money as amount + `_currency`, numbers right-aligned, tabular)
  - [x] a column header that equals the Document ID header or another column of that table is an inline error on that column row and blocks Submit
  - [x] a document without rows adds none; a table with 50+ rows shows only the first 5 in the preview with the full count in the line under it

## Backend needs
Store `tableColumns` with the type's export mapping; apply it when building separate sheets/files (Document ID first) and flattened rows; compute computed columns that aren't stored before exporting.

## Open questions
- **Decided (2026-10-27):** flattened CSV headers are used as typed, with no `<table>.` prefix (default = the column key); collisions with document headers are inline errors.
- **Decided (2026-10-27):** the column list is a collapsed disclosure under the table row.
- **Decided (2026-10-27):** branch `export-table-columns-018` from `main` (017 is already merged there, so computed columns are covered).
- **Decided (2026-10-27):** an included table needs at least one included column; Document ID in a separate sheet uses the main Document ID header.
- **Decided (2026-10-27):** the separate sheet/file preview shows up to 5 rows from the first 3 selected documents.
- In flatten mode the table row's own header is unused (there is no prefix any more) but stays editable; it could be hidden there.
- Nested move buttons say "Move <column> up"; two tables with a same-named column give identical names.
- The mock still builds only a one-file CSV; the separate files of a CSV zip and XLSX sheets are generated by the backend (009).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
| 2026-10-27 | — | ready | questions answered; split into 2 slices |
| 2026-10-27 | 1 | done | `tableColumns` in the mapping (defaults, restore, reset); "Columns (n of m)" disclosure with include / header / up-down per column, "Computed" note, opens on errors; flattened CSV uses the mapped columns as typed (no prefix), computed cells via `applyComputedCells`; zero-columns and empty-header errors block Submit. `lib/mock/types.ts`, `lib/fields/export-mapping.ts`, `features/export/{export-plan,export-header-errors,column-mapping,table-column-list}` |
| 2026-10-27 | 2 | done | a plan per separate sheet/file (Document ID under the main header, then the mapped columns, computed cells filled); duplicates within a sheet/file are inline errors on the column row; a preview per sheet/file (up to 5 rows from the first 3 documents, count over all). `features/export/{export-plan,export-header-errors,mapping-preview,separate-table-preview}` |
| 2026-10-27 | — | UI check | `export`, `export?type=type-invoice` at 375/1280, light/dark: passed; also checked the expanded list, flatten, no-columns error and XLSX states. Screenshots in `apps/web/e2e/screenshots/018/` |
