# 017 — Row actions (table rows)

**Status:** draft · **Depends on:** 016 · **Route(s):** `/types/:typeId`, `/documents/:documentId`

## Goal
The user adds computed columns and checks that work per table row ("Net = Quantity × Unit net price", "Gross = Net + VAT" on every line item), so line items are calculated and checked like document-level fields.

## Scope
- In: an expression reference to "this row's column", computed table columns, per-row checks with severity and tolerance, the builder editor for them, evaluation and highlighting per row in Review (Table and List views).
- Out: checks across rows other than the existing list functions, nested tables.

## Data
Extends 016: `Expr` gets a row-scoped column reference (e.g. `{ kind: 'cell'; columnId }`) valid only inside a row action; `FieldAction` gets row variants scoped to a table field. Same registry and `evaluateExpr`.

## Slices
To be split into slices at review.

## Backend needs
-

## Open questions
- From 016: per-row computed columns and per-row checks were left out of the first release.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
