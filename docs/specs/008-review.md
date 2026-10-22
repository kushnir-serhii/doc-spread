# 008 — Review (core screen)

**Status:** draft · **Depends on:** 002, 006, 013 · **Route(s):** `/documents/:documentId`

## Goal
The user checks the AI-extracted values against the document, fixes the low-confidence ones by typing or by pointing at the document, and approves fast, mostly from the keyboard. The form is built from the document's type, so it works for any type.

## Scope
- In: the viewer (013) on the left with source boxes; a form generated from the type's fields on the right; per-field confidence; low-confidence highlight; fixing by pointing; changing the type; approve / reject (with reason) / save draft; keyboard shortcuts; next document.
- Out: audit history, comments, cross-field rules (such as totals matching).

## Data
`Document`, `DocumentType`, `ExtractedValue`, `TableValue`, `useDocument(id)`, `useDocumentType(typeId)`, `useDocumentPages(id)`, `useUpdateDocumentValues()`, `useApproveDocuments()`, `useRejectDocument()`, `useReassignDocumentType()`, `useAddFieldExample()`, `useDocuments({ typeId, status: 'needs_review' })` for "next".

## Slices

### [ ] 1. Layout + read-only fields
- **Build:** a field registry: one component per `FieldType` for viewing and for editing (`text → Input`, `money → MoneyInput`, `date → DateInput`, `select → Select`, `boolean → Switch`, `table → FieldTable`…).
- **Files:** `src/pages/review/`, `src/features/documents/review/`, `src/features/documents/fields/`
- **Accept:**
  - [ ] two panes on desktop; stacked on mobile (viewer collapsible)
  - [ ] every field shows its value and a confidence badge; null shows "Not found"
  - [ ] focusing a field highlights and scrolls to its box; clicking a box focuses the field
  - [ ] skeleton, not-found document, and error states

### [ ] 2. Editable form + draft
- **Accept:**
  - [ ] low-confidence fields are highlighted with a token color and an icon (not color alone)
  - [ ] editing a value sets its confidence to 1 (verified); money is edited in major units and stored in minor units, with the currency always shown
  - [ ] save draft goes through `useUpdateDocumentValues()`; leaving with unsaved changes asks for confirmation (`useBlocker`)

### [ ] 3. Fix by pointing
- **Accept:**
  - [ ] "Point on document" next to a field (and a shortcut) switches the viewer to `select-words`; the selected text is parsed into the field's type and becomes the value
  - [ ] after a fix, a non-blocking prompt: "Use this as an example for <type>?" → `useAddFieldExample()`
  - [ ] a parse failure (e.g. text pointed at for a date field) explains itself and keeps the old value

### [ ] 4. Table fields
- **Accept:**
  - [ ] a table field renders as an editable table with its columns; rows can be added and removed
  - [ ] 50+ rows stay usable (sticky header, contained scroll)

### [ ] 5. Type + approve / reject / next
- **Accept:**
  - [ ] the header shows the type; "Change type" re-runs extraction after a confirmation that the current values will be replaced
  - [ ] Approve is blocked while required fields are empty or invalid for their type, and says which ones
  - [ ] Reject opens a dialog with a required reason
  - [ ] after an action: go to the next `needs_review` document of the same type, or back to the Inbox with a message if none are left

### [ ] 6. Keyboard
- **Accept:**
  - [ ] shortcuts: next/previous field, point on document, approve, next document; they don't fire while typing in a text input unless a modifier is used
  - [ ] a "?" help dialog lists them; all of them work with a screen reader running

## Backend needs
Field-level confidence and source boxes; validation for approval from the type (required, format, tax ID checksum); re-extraction after a type change; storing examples from corrections.

## Open questions
- Exact key bindings (e.g. `J/K`, `Ctrl+Enter` to approve)?
- Cross-field rules (Gross = Net + VAT, totals = sum of a column) moved to [016 Field actions](016-field-actions.md); Review shows their results there.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | form built from the type schema; fixing by pointing; invoice totals check moved to 016 (field actions) |
