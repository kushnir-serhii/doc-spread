# 006 — Inbox (dashboard)

**Status:** in-progress · **Depends on:** 002, 012 · **Route(s):** `/inbox`

## Goal
The user sees every document, of any type, with its status and AI confidence, finds one quickly, deals with documents the AI couldn't classify, and approves or exports in bulk.

## Scope
- In: a type switcher (All / each type / Unclassified), a table whose columns come from the type's `listColumnIds`, status filter, search across all values, row selection, bulk approve, bulk export, mobile card layout.
- Out: pagination on the server, saved views, editing columns here (that's in the builder, 014).

## Data
`Document`, `DocumentType`, `DOCUMENT_STATUSES`, `useDocuments({ typeId, status, search })`, `useDocumentTypes()`, `useApproveDocuments()`, `useReassignDocumentType()`, `StatusBadge`, `ConfidenceBadge`, `formatFieldValue`.

## Slices

### [x] 1. Table with real states
- **Build:** add shadcn `table` and `skeleton`. "All types" shows the fixed columns title (the type's title field, or the file name), type, uploaded, status and confidence. A row click opens `/documents/:id`.
- **Files:** `src/pages/inbox/`, `src/features/documents/document-table.tsx`
- **Accept:**
  - [x] skeleton while pending; error with retry; empty state with CTAs to `/upload` and `/types`
  - [x] long values are truncated with the full value in a `title`

### [ ] 2. Type switcher + dynamic columns
- **Accept:**
  - [ ] tabs or a select for All / each type (with the count needing review) / Unclassified; synced to `?type=` (`?type=unclassified` lists `status: 'unclassified'`; counts are computed on the client from `useDocuments()`)
  - [ ] with a type chosen, the columns are its `listColumnIds`, rendered through `formatFieldValue`; money and number columns are right-aligned with `tabular-nums`; table fields show a row count
  - [ ] a type with 6 columns plus status still fits at 1280px; narrower screens scroll the table horizontally, not the page

### [ ] 3. Filter + search in the URL
- **Accept:**
  - [ ] the status filter and search sync to `?status=&q=`; a reload keeps them
  - [ ] search is debounced (~250 ms); a "no results" state differs from "no documents yet"

### [ ] 4. Unclassified bucket
- **Accept:**
  - [ ] each row offers "Assign type" (a select of the user's types; `Document.classification` has no guessed type yet, so the AI's best guess first waits for the backend, see **Backend needs**) and "Create type from this" (to 015 with `?documentId=`)
  - [ ] assigning moves the document to processing with a status message; the count updates

### [ ] 5. Selection + bulk actions + mobile
- **Accept:**
  - [ ] checkbox per row plus select-all (with an indeterminate state); every checkbox is labelled
  - [ ] Approve only applies to `needs_review` rows and says how many are skipped; after success the selection clears and a status message is announced
  - [ ] Export is available only when one type is chosen and goes to `/export?type=&ids=…`
  - [ ] at 375px rows render as cards (title, type, status, the first two columns) and the bulk bar is sticky at the bottom with 44px targets

## Backend needs
List endpoint filtered by type and status, full-text search over values, sort, cursor pagination; counts per type and status; bulk approve with a per-id result; reassigning a type triggers extraction; the classifier's best-guess type for an unclassified document.

## Open questions
- Default sort: upload date, or a date field of the type? For now newest upload first (what the mock returns).
- Which statuses count as "needs attention" for a badge in the sidebar (needs review + unclassified + error?)

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | invoices → documents of any type; added the type switcher and the unclassified bucket |
| 2026-10-23 | — | ready | checked against the code: `?type=unclassified` maps to the status, counts computed on the client, best-guess type moved to Backend needs (the model has none), default sort = newest upload |
| 2026-10-23 | 1 | done | `DocumentTable` (title = type title field or file name, type, uploaded, status, confidence; a dash while there is no confidence), title `<Link>` stretched over the row; skeleton (`role="status"`), error with retry, empty with CTAs to `/upload` and `/types`; `overflow-x-auto` so 375px scrolls the table, not the page. Fixed in review: shadcn `cn` import bug, class strings through `cn()`. Headless Chrome: 1280 light, 375 dark · `pages/inbox/inbox-page.tsx`, `features/documents/document-table{,-skeleton,-error,-empty}.tsx`, `components/ui/{table,skeleton}.tsx`, `app/router.tsx` |
