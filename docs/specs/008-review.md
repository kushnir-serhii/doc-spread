# 008 — Review (core screen)

**Status:** draft · **Depends on:** 002, 006, 013 · **Route(s):** `/documents/:documentId`

## Goal
The user checks the AI-extracted values against the document, fixes the low-confidence ones by typing or by pointing at the document, and approves fast, mostly from the keyboard. The form is built from the document's type, so it works for any type.

## Scope
- In: the viewer (013) on the left with source boxes; a form generated from the type's fields on the right; per-field confidence; low-confidence highlight; fixing by pointing; changing the type; approve / reject (with reason) / save draft; keyboard shortcuts; next document.
- Out: audit history, comments, cross-field rules (such as totals matching).

## Data
`Document`, `DocumentType`, `ExtractedValue`, `TableValue`, `useDocument(id)`, `useDocumentType(typeId, typeVersion)`, `useDocumentPages(id)`, `useUpdateDocumentValues()`, `useApproveDocuments()`, `useRejectDocument()`, `useReassignDocumentType()`, `useAddFieldExample()`, `useDocuments({ typeId, status: 'needs_review' })` for "next".

- **Which type version:** the form uses the version the document was extracted with (`document.typeVersion`), so a later edit of the type never changes an open document's form.
- **Low confidence:** `confidence < LOW_CONFIDENCE`, one constant `LOW_CONFIDENCE = 0.9` in `src/lib/fields/confidence.ts`, the only place the threshold lives (Inbox and 015 use it too).
- **Field components:** the registry and the per-type inputs live in `src/features/documents/fields/` (domain UI, shared with 014 and 015). Pure, non-UI helpers stay in `src/lib/fields/`: `parse-field-value.ts` (text → typed value, also used by 015) and `validate-field-value.ts`.
- **Status → what the screen shows:** `needs_review` is editable. `approved` and `exported` are read-only with their status shown. `rejected` is read-only with the reason. `unclassified` shows "Choose a type" (`useReassignDocumentType()`). `uploaded` and `processing` show a processing state. `error` shows `errorMessage` with a way back to the Inbox.

## Slices

### [ ] 1. Layout + read-only fields
- **Build:** the page and a field registry: one component per `FieldType` for viewing and for editing (`text → Input`, `money → MoneyInput`, `date → DateInput`, `select → Select`, `boolean → Switch`, `table → FieldTable`…). Add the missing shadcn primitives (`select`, `switch`, `dialog`). Split the pointing and rotation wiring out of `document-viewer.tsx` (~170 lines, 013's open question) before adding to it.
- **Files:** `src/pages/review/review-page.tsx`, `src/app/router.tsx`, `src/features/documents/review/`, `src/features/documents/fields/`, `src/lib/fields/confidence.ts`, `src/features/documents/viewer/`, `src/components/ui/`
- **Accept:**
  - [ ] two panes on desktop; stacked on mobile (viewer collapsible)
  - [ ] every field shows its value and a confidence badge; null shows "Not found"; long values wrap or truncate with a title
  - [ ] focusing a field highlights and scrolls to its box; clicking a box focuses the field
  - [ ] skeleton, not-found document, and error-with-retry states; each document status shows what **Data** says
  - [ ] `document-viewer.tsx` is back under ~150 lines

### [ ] 2. Editable form + draft
- **Files:** `src/features/documents/review/`, `src/features/documents/fields/`
- **Accept:**
  - [ ] low-confidence fields (`< LOW_CONFIDENCE`) are highlighted with a token color and an icon (not color alone)
  - [ ] editing a value sets its confidence to 1 (verified); "Confirm" on a low-confidence field sets it to 1 without changing the value
  - [ ] money is edited in major units and stored in minor units, with the currency always shown
  - [ ] save draft goes through `useUpdateDocumentValues()` with pending, success and error states; leaving with unsaved changes asks for confirmation (`useBlocker`)

### [ ] 3. Fix by pointing
- **Files:** `src/features/documents/review/`, `src/lib/fields/parse-field-value.ts`
- **Accept:**
  - [ ] "Point on document" next to a field switches the viewer to `select-words`; the selected text is parsed into the field's type and becomes the value, with the selection's bbox as its new source
  - [ ] after a fix, a non-blocking prompt: "Use this as an example for <type>?" → `useAddFieldExample()` (the example's `anchorText` is left empty; the backend works it out)
  - [ ] a parse failure (e.g. text pointed at for a date field) explains itself in a `role="alert"` and keeps the old value

### [ ] 4. Table fields
- **Files:** `src/features/documents/fields/`
- **Accept:**
  - [ ] a table field renders as an editable table with its columns; rows can be added and removed
  - [ ] 50+ rows stay usable (sticky header, contained scroll); amounts are right-aligned with `tabular-nums`

### [ ] 5. Type + approve / reject / next
- **Files:** `src/features/documents/review/`, `src/lib/fields/validate-field-value.ts`
- **Accept:**
  - [ ] the header shows the type; "Change type" re-runs extraction after a confirmation that the current values will be replaced
  - [ ] Approve is blocked while required fields are empty or invalid for their type, and says which ones (each links to its field)
  - [ ] Reject opens a dialog with a required reason
  - [ ] after an action: go to the next `needs_review` document of the same type, or back to the Inbox with a message if none are left
  - [ ] Approve and Reject work at 375px (44px targets, always reachable)

### [ ] 6. Keyboard
- **Files:** `src/features/documents/review/`
- **Accept:**
  - [ ] shortcuts (bindings from **Open questions**): next/previous field, point on document, approve, next document; they don't fire while typing in a text input unless a modifier is used
  - [ ] a "?" help dialog lists them; all of them work with a screen reader running

## Backend needs
Field-level confidence and source boxes; the type version a document was extracted with; validation for approval from the type (required, format, tax ID checksum); re-extraction after a type change; storing examples from corrections, with the anchor label found on the server.

## Open questions
- Exact key bindings, needed before slice 6. Proposed: `J`/`K` next/previous field, `P` point on document, `Ctrl+Enter` approve, `N` next document, `?` help. The alternative is Alt-based (`Alt+↓/↑`, `Alt+P`, `Alt+N`), which also works while typing.
- Cross-field rules (Gross = Net + VAT, totals = sum of a column) moved to [016 Field actions](016-field-actions.md); Review shows their results there.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | form built from the type schema; fixing by pointing; invoice totals check moved to 016 (field actions) |
| 2026-10-23 | — | reviewed | checked against product, conventions and process: type version, LOW_CONFIDENCE = 0.9, the fields folder, the screen for each status, a Confirm action, 375px Approve, Files for every slice |
