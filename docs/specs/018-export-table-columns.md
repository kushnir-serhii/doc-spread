# 018 — Export: table column mapping

**Status:** draft · **Depends on:** 009 · **Route(s):** `/export`

## Goal
The user maps the columns of table fields (line items) in an export the same way as document fields: include, header name, order — so the file matches an accountant's import template.

## Scope
- In: per-column include, header and order for each table field, in both a separate sheet/file and the flattened mode; saved with the type's export mapping; preview.
- Out: per-column transforms or formulas.

## Data
Extends `ExportColumnMapping` (009) with per-table column lists.

## Slices
To be split into slices at review.

## Backend needs
-

## Open questions
- From 009: table columns are exported under their keys with no mapping.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-26 | — | drafted | from the open questions of 009 / 016 |
