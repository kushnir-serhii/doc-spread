# 008 — Review (core screen)

**Status:** in-progress · **Depends on:** 002, 006, 013 · **Route(s):** `/documents/:documentId`

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

### [x] 1. Layout + read-only fields
- **Build:** the page and a field registry: one component per `FieldType` for viewing and for editing (`text → Input`, `money → MoneyInput`, `date → DateInput`, `select → Select`, `boolean → Switch`, `table → FieldTable`…). Add the missing shadcn primitives (`select`, `switch`, `dialog`). Split the pointing and rotation wiring out of `document-viewer.tsx` (~170 lines, 013's open question) before adding to it.
- **Files:** `src/pages/review/review-page.tsx`, `src/app/router.tsx`, `src/features/documents/review/`, `src/features/documents/fields/`, `src/lib/fields/confidence.ts`, `src/features/documents/viewer/`, `src/components/ui/`
- **Accept:**
  - [x] two panes on desktop; stacked on mobile (viewer collapsible)
  - [x] every field shows its value and a confidence badge; null shows "Not found"; long values wrap or truncate with a title
  - [x] focusing a field highlights and scrolls to its box; clicking a box focuses the field
  - [x] skeleton, not-found document, and error-with-retry states; each document status shows what **Data** says
  - [x] `document-viewer.tsx` is back under ~150 lines

### [x] 2. Editable form + draft
- **Files:** `src/features/documents/review/`, `src/features/documents/fields/`
- **Accept:**
  - [x] low-confidence fields (`< LOW_CONFIDENCE`) are highlighted with a token color and an icon (not color alone)
  - [x] editing a value sets its confidence to 1 (verified); "Confirm" on a low-confidence field sets it to 1 without changing the value
  - [x] money is edited in major units and stored in minor units, with the currency always shown
  - [x] save draft goes through `useUpdateDocumentValues()` with pending, success and error states; leaving with unsaved changes asks for confirmation (`useBlocker`)

### [x] 3. Fix by pointing
- **Files:** `src/features/documents/review/`, `src/lib/fields/parse-field-value.ts`
- **Accept:**
  - [x] "Point on document" next to a field switches the viewer to `select-words`; the selected text is parsed into the field's type and becomes the value, with the selection's bbox as its new source
  - [x] after a fix, a non-blocking prompt: "Use this as an example for <type>?" → `useAddFieldExample()` (the example's `anchorText` is left empty; the backend works it out)
  - [x] a parse failure (e.g. text pointed at for a date field) explains itself in a `role="alert"` and keeps the old value

### [ ] 4. Table fields
- **Files:** `src/features/documents/fields/`
- **Accept:**
  - [ ] a table field renders with the shared table-field view: "Table" (grid) or "List" (a card per row), Table by default from `md` up and List below, a "Table | List" toggle remembered by the browser; in both modes cells are editable and rows can be added and removed
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
- Exact key bindings? **Decided:** `J`/`K` next/previous field, `P` point on document, `Ctrl+Enter` approve, `N` next document, `?` help. Letter keys fire only outside text inputs; `Esc` leaves an input.
- Not-found and failed look the same: the mock `getDocument` throws a plain `Error`, so both show the error state with Retry and a link to the Inbox. Backend: a 404 the client can tell apart.
- Table cells are reachable from a box click, but not by Tab (`tabIndex=-1`, to avoid one tab stop per cell). Keyboard movement inside a table comes with slice 4.
- `MoneyInput` keeps the typed text only while it still parses to the current value, so a value set from outside (slice 3) replaces it. **Done in slice 2.**
- A field flagged below `LOW_CONFIDENCE` can carry a "Medium" badge (0.7–0.9), so the flag says "Check this value — the AI isn't sure", not "Low confidence". Empty values (confidence 0) are flagged too, and Confirm marks them as verified empty.
- Dirty compares values including confidence: editing a value back to the original still counts as a change (it is now verified), and Save sends it.
- `LeaveGuard` lives in `features/document-types/`; Review imports it from there. Move it to `components/` once 014, 008 and 015 are all merged.
- The viewer's `scrollToHighlight(id, { focus })` gained an optional `focus` flag (default `true`): Review scrolls the box into view but keeps keyboard focus in the form.
- Money pointed at without a currency? **Decided:** keep the field's current currency, else `DEFAULT_CURRENCY` (USD), and always warn: the row shows "There is no currency in …, so USD was assumed" and the value stays unverified (flagged, with Confirm). No country defaults anywhere (conventions.md, Money).
- `1,234` (one comma, exactly three digits after it) is read as 1234 (thousands); `12,5` and `1234,56` are decimals. Ambiguous for some locales; no country-specific rule is added.
- The point button is an icon beside the input (tooltip + `aria-label`), not a labelled button under it: a row per field stays short.
- Table or list for table fields? **Decided:** one shared table-field view with two modes, "Table" (a grid) and "List" (a card per row with label: value pairs). Table by default from `md` up, List below it; a "Table | List" toggle next to the field switches it, and the browser remembers the choice (localStorage, a per-viewer convenience). Used for the preview here (015 slice 4) and for viewing and editing in Review (008 slice 4).
- Cross-field rules (Gross = Net + VAT, totals = sum of a column) moved to [016 Field actions](016-field-actions.md); Review shows their results there.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | form built from the type schema; fixing by pointing; invoice totals check moved to 016 (field actions) |
| 2026-10-26 | 3 | done | "Point on document" per editable scalar field (icon button beside the input; "Cancel pointing" while active), viewer in `select-words` (opens on mobile), `parseFieldValue` for every scalar type in `lib/fields/parse-field-value.ts` (shared with 015), value + new source on success, reason in `role="alert"` with Try again on failure, inline "Use this as an example for <type>?" → `useAddFieldExample()`; an amount without a currency gets the current currency or USD (`lib/fields/default-currency.ts`), a warning, and stays unverified. `MoneyInput` defaults to USD. Files: `lib/fields/parse-field-value.ts`, `features/documents/review/` (`use-review-pointing.ts`, `review-point-button.tsx`, `review-point-feedback.tsx`, row, form, workspace, viewer pane, `use-review-draft.ts`), `lib/fields/default-currency.ts`, `features/documents/fields/money-input.tsx`, `docs/conventions.md` |
| 2026-10-23 | 2 | done | editable form for `needs_review` (registry Edit inputs), low-confidence container + icon + text, Confirm, confidence 1 on edit and confirm, viewer boxes from the draft, Save draft with pending/success/error, `LeaveGuard` with review copy (new optional `description`); header no longer says "No type yet" while the type loads. Files: `features/documents/review/` (`use-review-draft.ts`, `review-save-bar.tsx`, row, form, workspace, highlights, header), `features/documents/fields/` (`field-value-edit.tsx`, `money-input.tsx`), `features/document-types/leave-guard.tsx` |
| 2026-10-23 | 1 | done | review page and route, fields registry (view + edit inputs, read-only table), screen per status, highlights linked to fields, `LOW_CONFIDENCE` in `lib/fields/confidence.ts` (used by `confidenceLevel`), viewer zoom/rotation moved into hooks (147 lines), shadcn select/switch/dialog, `--spacing-review-pane` token. Files: `pages/review/`, `features/documents/review/`, `features/documents/fields/`, `features/documents/viewer/`, `lib/fields/confidence.ts`, `lib/mock/format.ts`, `app/router.tsx`, `styles/index.css`, `components/ui/` |
| 2026-10-23 | — | ready | approved; key bindings decided |
| 2026-10-23 | — | reviewed | checked against product, conventions and process: type version, LOW_CONFIDENCE = 0.9, the fields folder, the screen for each status, a Confirm action, 375px Approve, Files for every slice |
