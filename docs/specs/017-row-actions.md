# 017 — Row actions (table rows)

**Status:** done · **Depends on:** 016 · **Route(s):** `/types/:typeId`, `/documents/:documentId`

## Goal
The user adds computed columns and checks that work per table row ("Net = Quantity × Unit net price", "Gross = Net + VAT" on every line item), so line items are calculated and checked like document-level fields.

## Scope
- In: an expression reference to "this row's column", computed table columns, per-row checks with severity and tolerance, the builder editor for them, evaluation and highlighting per row in Review (Table and List views).
- Out: checks across rows other than the existing list functions, nested tables.

## Data
Extends 016. Same registry and `evaluateExpr`.

```ts
export type Expr =
  | …                                        // field, column, const, call (016)
  /** this row's value in a column of the action's table; valid only inside a row action */
  | { kind: 'cell'; columnId: string }

export interface RowCheckAction extends Omit<CheckAction, 'kind'> {
  kind: 'row_check'
  /** the table field whose every row is checked */
  tableFieldId: string
}

export interface RowComputeAction {
  kind: 'row_compute'
  id: string
  tableFieldId: string
  /** the target column; it is computed in every row, never extracted */
  columnId: string
  expr: Expr
}

export type FieldAction = CheckAction | ComputeAction | RowCheckAction | RowComputeAction
```

A row expression may read: cells of its own table's row, top-level fields that are **not** computed, constants, functions, and column lists (`sum(Line items › Net)`). It may not read computed document fields. Evaluation order: computed columns (per row, in dependency order) → computed fields → all checks. So document-level actions see computed cells, and the two levels can't form a cycle.

## Slices

### [x] 1. Types + row evaluation + template
- **Build:** the types above; `cell` in `evaluateExpr` (the context carries the current row); row computed columns in dependency order with cycle detection; row checks in `runChecks` (outcomes per row); computed cells written into the rows before document-level computes and checks; every exhaustive switch handles the new kinds (`mapActionIds`, `collectFieldIds`, `describeExpr` → "This row › Quantity" or the column label, builder rows show them minimally until slice 2). Mock extraction and `testExtract` skip computed columns. Invoice template and the seed Invoice types (v1, v2) get the row check "Net = Quantity × Unit net price" (tolerance 0.01, warning) and the computed column Gross = Net + VAT; one USD `needs_review` seed invoice has a line whose Net ≠ Quantity × Unit net price.
- **Files:** `src/lib/mock/types.ts`, `src/lib/fields/{evaluate,action-ids,computed-fields}.ts`, `src/lib/mock/{templates,document-types-seed,documents-seed,fake-extract}.ts`
- **Accept:**
  - [x] `cell` evaluates against the current row; outside a row action it is `type_mismatch`
  - [x] computed columns feed each other in dependency order; a cycle fails every column in it with `cycle`, naming the columns
  - [x] a row check gives one outcome per row: passed / failed (both sides) / error (reason, empty inputs); a table with no rows has nothing to check; a row where every input of the check is empty is skipped
  - [x] `sum(Line items › Gross)` sees computed Gross values; a row action can't read a computed document field (`type_mismatch`)
  - [x] the Invoice template, seed types and the seed invoice with a bad line are in place

### [x] 2. Row actions in the builder
- **Build:** in the action dialog, an "Applies to" choice (Whole document / Each row of <table>), shown only when the type has a table field. With a row scope the expression picker also offers "This row › <column>" for the chosen table, a computed action targets a column of that table, and computed document fields are not offered. Rows in "Actions (n)" show the scope. The field editor marks computed columns "Computed by …" (hint, examples and required hidden). The preview summarises row results on the sample document.
- **Files:** `src/features/document-types/actions/*`, `src/features/document-types/` (field editor, validation)
- **Accept:**
  - [x] only the cells, fields and functions whose types fit are offered; the readable line shows "This row › Quantity × This row › Unit net price"
  - [x] a row check has operator, tolerance and severity like a check; a computed column's type must equal the expression's result type
  - [x] a cycle between computed columns, a deleted column or table, or a column whose type no longer fits is a draft validation error (Save blocked, `ErrorSummary` links to the action)
  - [x] the preview says "Fails in 2 of 64 rows" with the first failing rows and both sides' values; for a computed column, the first computed values

### [x] 3. Computed columns in Review
- **Build:** computed cells are derived from the draft every render (like computed fields), shown read-only in the grid and in List cards, and stored with the next save with confidence 1.
- **Files:** `src/features/documents/review/use-review-draft.ts`, `src/features/documents/fields/*`
- **Accept:**
  - [x] a computed column has a calculator "computed" marker in the grid header and in each List card label; its cells can't be edited but stay focusable
  - [x] cells update as soon as their inputs change; a cell that can't be computed shows "—" with the reason as title and screen-reader text
  - [x] a computed value that differs from the stored one is saved with the next save and never makes the document dirty on its own

### [x] 4. Row checks in Review
- **Build:** row check outcomes join the check summary above the form and the Approve flow from 016.
- **Files:** `src/features/documents/review/{summarize-checks,review-workspace,review-form,review-field-row}.tsx/ts`, `src/features/documents/fields/*`
- **Accept:**
  - [x] one list entry per row check, not per row: "Net = Quantity × Unit net price — fails in rows 3, 7 (2 of 64)", with "go to" focusing the first involved cell of the first failing row
  - [x] cells involved in a failed row check get the warning ring in that row, in Table and List views; a List card says "Row fails a check"
  - [x] a failed blocking row check joins the Approve problem list; failed warnings and can't-check rows go into "Approve with N warnings?"; no second Approve path

## Backend needs
Store row actions with the type version; evaluate computed columns and row checks on the server before approval and export, in the same order as the frontend (computed columns → computed fields → checks); computed cells included in exports under their column keys.

## Open questions
- From 016: per-row computed columns and per-row checks were left out of the first release.
- **Decided (2026-10-27):** new action kinds `row_check` and `row_compute` (not flags on the 016 kinds) and an `Expr` node `{ kind: 'cell'; columnId }`.
- **Decided (2026-10-27):** a row expression reads its row's cells, non-computed top-level fields, constants, functions and column lists; never a computed document field. Order: computed columns → computed fields → checks.
- **Decided (2026-10-27):** computed columns feed each other in dependency order; a cycle is an error naming the columns.
- **Decided (2026-10-27):** no rows = nothing to check; a row whose every check input is empty is skipped; a partly filled row is "can't check" (never blocks, confirmed on Approve).
- **Decided (2026-10-27):** computed cells are stored with confidence 1 and exported under their column key; mock extraction and `testExtract` skip computed columns.
- **Decided (2026-10-27):** Invoice template and seed types: row check Net = Quantity × Unit net price (0.01, warning) and computed column Gross = Net + VAT; one USD `needs_review` seed invoice with a bad line.
- **Decided (2026-10-27):** the builder uses one dialog with an "Applies to" choice, not new menu items.
- **Decided (2026-10-27):** Review lists one entry per row check with the failing row numbers; the involved cells are highlighted per row.

- **Decided (2026-10-27):** inside a row compute, a column list over a computed column is `type_mismatch` (its order would be undefined); row checks and document-level actions may read it.
- Seed doc-029 fails both the document check "Gross = Net + VAT" and the row check (first line).
- **Decided (2026-10-27):** a computed column's own column stays in the "This row" picker; choosing it shows the cycle error (as for computed fields).
- Later: the read-only table of approved documents (`field-table.tsx`) shows computed values without the computed marker.
- **Decided (2026-10-27):** a row check that reads no cells (only fields or column lists) has no cell to ring; go-to falls back to the table field. Top-level fields a failed row check reads are marked "Involved in a failed check", as for document checks.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
| 2026-10-27 | — | ready | questions answered (all recommended), split into 4 slices |
| 2026-10-27 | 1 | done | `cell` node, `row_check` / `row_compute`; `evaluate-rows.ts` (`computeRowValues`, `applyComputedCells`, `runRowChecks`), `run-checks.ts` (order: columns → fields → checks; `resolveValues`, `computeValues`, `runChecks`, `runRowChecksOnDocument`); id mapping, describe "This row › …"; extraction skips computed columns; Invoice row check + computed Gross; doc-029 `badLine`; builder lists row actions read-only. `lib/fields/*`, `lib/mock/{types,templates,documents-seed,fake-extract,api}.ts`, `lib/api/builder.ts`, `features/document-types/actions/*`, review/export imports |
| 2026-10-27 | 2 | done | "Applies to" scope in the action dialog, "This row › column" in the picker, row checks and computed columns saved as `row_check` / `row_compute`, row-scoped validation (cycles, deleted table/column, type, cell scope) through `actionProblems`, row previews ("Fails in N of M rows", first computed values), computed columns marked in the column list and editor. `features/document-types/actions/*` (new: `action-scope`, `row-scope`, `row-action-problems`, `find-cycle`, `scope-select`, `cell-select`, `row-compute-form`, `row-check-preview`, `row-compute-preview`, `preview-box`, `preview-row-list`, `row-count-text`), `selected-editor.tsx`, `column-list.tsx`, `field-list.tsx`, `type-builder.tsx` |
| 2026-10-27 | 3 | done | computed cells derived each render (`resolveValues`), read-only and focusable in grid and List (calculator marker, "—" with the reason as title and sr text, `readOnlyCols` in grid navigation); tables with stale computed cells stored on the next save, never dirty; validation skips computed cells. `features/documents/review/{use-review-draft,review-workspace,review-form,review-field-row}`, `features/documents/fields/{computed-mark,table-field-view,table-grid,table-grid-row,table-grid-cell,table-list,table-list-card,use-grid-navigation}`, `lib/fields/{evaluate-rows,validate-field-value}.ts` |
| 2026-10-27 | 4 | done | one entry per row check ("Fails in rows 1, 3 (2 of 64)", max 5 numbers, can't-check grouped by reason), go-to focuses the first involved cell of the first failing row, warning ring + sr text on involved cells in grid and List, "Row fails a check" on List cards; blocking → Approve problems, warnings and can't-check → "Approve with N warnings?". `features/documents/review/{summarize-checks,summarize-row-checks,review-workspace,review-form,review-field-row}`, `features/documents/fields/{row-failures,table-field-view,table-grid,table-grid-row,table-grid-cell,table-list,table-list-card}` |
| 2026-10-27 | UI check | passed | `SPEC=017 ROUTES=types/type-invoice,documents/doc-029,documents/doc-009`, 12/12. The check now waits for skeletons (before, Review was captured while loading); that exposed a page-level horizontal scroll from the Line items grid, fixed (`grid-cols-1` on the workspace, `relative` on the grid's scroll container). `e2e/ui-check.spec.ts`, `review-workspace{,-skeleton}.tsx`, `table-grid.tsx` |
