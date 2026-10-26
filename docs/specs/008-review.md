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

### [x] 4. Table fields
- **Files:** `src/features/documents/fields/`
- **Accept:**
  - [x] a table field renders with the shared table-field view: "Table" (grid) or "List" (a card per row), Table by default from `md` up and List below, a "Table | List" toggle remembered by the browser; in both modes cells are editable and rows can be added and removed
  - [x] 50+ rows stay usable (sticky header, contained scroll); amounts are right-aligned with `tabular-nums`
  - [x] in Table mode the grid works like a spreadsheet: arrow keys move between cells, Enter edits a cell, Esc stops editing, Tab leaves the table
  - [x] a row is removed at once, without a dialog (the draft and the leave guard cover mistakes)
  - [x] low-confidence cells are flagged like fields (token background + icon); "Confirm table" verifies every cell
  - [x] a box click on the document focuses its cell; pointing at the document for cells is out of scope (cells are fixed by typing)

### [x] 5. Type + approve / reject / next
- **Files:** `src/features/documents/review/`, `src/lib/fields/validate-field-value.ts`
- **Accept:**
  - [x] the header shows the type; "Change type" (only for `needs_review`) re-runs extraction after a confirmation that says the current values and any unsaved edits will be replaced
  - [x] Approve is blocked while required fields are empty or invalid for their type, and says which ones (each links to its field); the client checks formats only, never country-specific checksums (those are the backend's)
  - [x] Approve with unsaved edits saves them first, then approves, as one action
  - [x] Reject opens a dialog with a required reason: free text plus quick picks "Duplicate", "Not a <type>", "Unreadable"
  - [x] after an action: go to the next `needs_review` document of the same type (the oldest first, like a queue), or back to the Inbox with a message if none are left
  - [x] Approve and Reject work at 375px: a sticky bottom bar with Approve / Reject / Save draft (44px targets)

### [ ] 6. Keyboard
- **Files:** `src/features/documents/review/`
- **Accept:**
  - [ ] shortcuts (bindings from **Open questions**): next/previous field, point on document, approve, next document; they don't fire while typing in a text input unless a modifier is used
  - [ ] J/K move between field rows in a navigation mode (the row, not its input, takes focus); Enter edits the row's input, Esc returns to the row
  - [ ] `C` confirms the current field and `Ctrl+S` saves the draft (instead of the browser's "save page")
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
- The shared table-field view for 015: `<TableFieldView label columns value focusId onChange? />` in `features/documents/fields/table-field-view.tsx`; read-only without `onChange`; the Table/List choice is stored under `docspread.table-view`.
- A table's row-level flag and Confirm in Review are off; "Confirm table" inside the view does it. Two table fields on one screen don't share a Table/List switch until reload.
- A grid cell stays in edit mode after a click outside until Esc, Enter or focus moves to another cell (ending on blur would close an open select).
- Both table views scroll inside `max-h-table-scroll` (70dvh): `max-h-96` showed less than one card in List mode.
- The next document is chosen from the loaded queue before Approve/Reject runs: once the action succeeds the document refetches and the actions may unmount, so nothing is awaited afterwards. A queue that changed meanwhile (someone else approved the next one) is not handled; the backend could return the next id with the action.
- Approve stays clickable while problems exist (it shows them instead of calling the API). The mock `approveDocuments` ignores required fields: the backend must validate again, incl. its own country-specific checksums.
- Asked up front for slices 4–6 (2026-10-26), all answered as recommended and written into the slices: spreadsheet-style keys in the table grid; rows removed without a dialog; flagged cells and "Confirm table"; no pointing for cells; Change type only for `needs_review`; format checks only on the client (no country checksums); Approve saves first; reject quick picks; oldest-first queue; a sticky action bar at 375px; J/K navigation mode with Enter/Esc; `C` confirms and `Ctrl+S` saves. Slice 4 builds the shared table-field view that 015 slice 4 reuses, so it goes first.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | form built from the type schema; fixing by pointing; invoice totals check moved to 016 (field actions) |
| 2026-10-26 | 5 | done | Change type (`needs_review` only, confirm dialog, re-extraction), `validateDocument` (required + formats, no checksums; shared checks in `lib/fields/field-formats.ts`), issues list linking to fields/cells, Approve saves first, Reject dialog with quick picks, oldest-first queue or Inbox with a notice (`inbox-notice.tsx`), sticky Approve/Reject/Save draft bar; `LeaveGuard` gained `isExempt`. Files: `features/documents/review/` (`change-type-control.tsx`, `reject-dialog.tsx`, `review-action-bar.tsx`, `review-actions.tsx`, `review-issues.tsx`, `review-done.ts`, `use-next-document.ts`, `use-review-actions.ts`, header, workspace, row, draft), `lib/fields/` (`validate-field-value.ts`, `field-formats.ts`, `parse-field-value.ts`), `features/documents/inbox-notice.tsx`, `pages/inbox/inbox-page.tsx`, `features/document-types/leave-guard.tsx` |
| 2026-10-26 | 4 | done | shared `TableFieldView` (Table grid with spreadsheet keys, roving tabindex, Enter/F2/typing edits, Esc/Enter ends; List cards), Table/List toggle (md default, remembered), add/remove row (focus to a neighbour, or to Add row after the last), flagged cells + Confirm table, box click focuses the cell; `--spacing-table-scroll` token. Files: `features/documents/fields/` (`table-field-view.tsx`, `table-grid*.tsx`, `use-grid-navigation.ts`, `table-list*.tsx`, `table-view-toggle.tsx`, `use-table-view-mode.ts`, `table-*-row-button.tsx`, `table-value-ops.ts`, `field-table*.tsx`), `features/documents/review/review-field-row.tsx`, `styles/index.css` |
| 2026-10-26 | 3 | done | "Point on document" per editable scalar field (icon button beside the input; "Cancel pointing" while active), viewer in `select-words` (opens on mobile), `parseFieldValue` for every scalar type in `lib/fields/parse-field-value.ts` (shared with 015), value + new source on success, reason in `role="alert"` with Try again on failure, inline "Use this as an example for <type>?" → `useAddFieldExample()`; an amount without a currency gets the current currency or USD (`lib/fields/default-currency.ts`), a warning, and stays unverified. `MoneyInput` defaults to USD. Files: `lib/fields/parse-field-value.ts`, `features/documents/review/` (`use-review-pointing.ts`, `review-point-button.tsx`, `review-point-feedback.tsx`, row, form, workspace, viewer pane, `use-review-draft.ts`), `lib/fields/default-currency.ts`, `features/documents/fields/money-input.tsx`, `docs/conventions.md` |
| 2026-10-23 | 2 | done | editable form for `needs_review` (registry Edit inputs), low-confidence container + icon + text, Confirm, confidence 1 on edit and confirm, viewer boxes from the draft, Save draft with pending/success/error, `LeaveGuard` with review copy (new optional `description`); header no longer says "No type yet" while the type loads. Files: `features/documents/review/` (`use-review-draft.ts`, `review-save-bar.tsx`, row, form, workspace, highlights, header), `features/documents/fields/` (`field-value-edit.tsx`, `money-input.tsx`), `features/document-types/leave-guard.tsx` |
| 2026-10-23 | 1 | done | review page and route, fields registry (view + edit inputs, read-only table), screen per status, highlights linked to fields, `LOW_CONFIDENCE` in `lib/fields/confidence.ts` (used by `confidenceLevel`), viewer zoom/rotation moved into hooks (147 lines), shadcn select/switch/dialog, `--spacing-review-pane` token. Files: `pages/review/`, `features/documents/review/`, `features/documents/fields/`, `features/documents/viewer/`, `lib/fields/confidence.ts`, `lib/mock/format.ts`, `app/router.tsx`, `styles/index.css`, `components/ui/` |
| 2026-10-23 | — | ready | approved; key bindings decided |
| 2026-10-23 | — | reviewed | checked against product, conventions and process: type version, LOW_CONFIDENCE = 0.9, the fields folder, the screen for each status, a Confirm action, 375px Approve, Files for every slice |
