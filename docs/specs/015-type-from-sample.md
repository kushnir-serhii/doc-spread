# 015 — Type from a sample

**Status:** in-progress · **Depends on:** 013, 014 · **Route(s):** `/types/new?from=sample`, `/types/new?documentId=:id`, `/types/:typeId/train`

## Goal
The user builds a type by showing a real document instead of typing a schema: the AI proposes fields with boxes on the document, the user keeps, renames or removes them, points at anything that's missing or wrong, and test-runs the type on a second sample before saving.

## Scope
- In: uploading samples (or starting from an unclassified document), AI field proposals, adding a field by pointing, fixing a field by pointing, a table from a region, a test run on more samples.
- Out: a positional (fixed-layout) mode. Examples are semantic: the box is a hint and a few-shot example for the AI, not fixed coordinates. Pointing on touch devices (013 keeps it desktop-only).

## Data
`FieldDef.examples`, `FieldExample`, `useUploadDocument()`, `useProposeFields(documentId)`, `useTestExtract()`, `useSuggestField()` and `useSuggestTable()` (new), `useCreateDocumentType()` / `useUpdateDocumentType()`, `DocumentViewer` (013), and from 014 the draft (`type-draft-reducer.ts`), the field editor (`selected-editor.tsx`), save (`use-type-save.ts`, `save-impact-dialog.tsx`) and `leave-guard.tsx`.

- **Before slice 1:** `document-types-014` must be merged into main and then into this branch.
- **The draft holds everything until Save.** Proposals, examples and fixes live in 014's type draft (`FieldDef.examples`). Nothing is written to the type before Save, which also holds for `/train`, so 015 doesn't use `useAddFieldExample()` (that's for 008).
- **Values and confidence:** `proposeFields` returns field definitions only. The values and confidence shown for a sample come from `useTestExtract({ fields: draft, documentId })`, run again after each change that affects them.
- **Examples:** at most one example per field per sample, so at most 5 per field. Pointing again on the same sample replaces that sample's example.
- **Low confidence:** `LOW_CONFIDENCE` from `src/lib/fields/confidence.ts`, the same constant as 008.
- **Folders:** `src/features/document-types/sample/` for this screen; parsing values goes through `src/lib/fields/parse-field-value.ts`, shared with 008.

**How pointing works:** the viewer's `onSelect` gives `page`, `bbox`, `tokens` and `text`. `useSuggestField()` sends them with the `documentId` to a new mock `suggestField`, which finds the nearest label to the left or above on that page (`anchorText`) and guesses the label (from the anchor), the type (date/money/number/email/phone/tax ID patterns, otherwise text) and a hint, reusing the logic in `propose-fields.ts`. All of that is saved on the field as a `FieldExample` in the draft.

## Slices

### [x] 1. Sample + AI proposals
- **Build:** three panes: the viewer, the proposed fields (each with value, confidence and accept/reject buttons), and the field editor from 014. `/types/new` (014's page) opens this screen for `?from=sample` and `?documentId=`.
- **Files:** `src/pages/types/new-type-page.tsx`, `src/features/document-types/sample/`
- **Accept:**
  - [x] upload one sample (or open with `?documentId=` from an unclassified document); a processing state with progress text while fields are proposed
  - [x] upload and proposal errors show a message with retry; a sample with no proposals explains that and offers "Point to add"
  - [x] hovering or focusing a field highlights its box and scrolls to it; clicking a box selects the field
  - [x] "Accept all", plus Accept / Reject on each field; rejected fields can be restored; the user can rename them inline
  - [x] desktop-first: three panes (viewer, proposals, editor) from `2xl`; at `lg` two panes (viewer 3/5, proposals 2/5), with the editor in 014's sheet; below `lg` everything stacks

### [x] 2. Add a field by pointing
- **Build:** the `useSuggestField()` hook and the `suggestField` mock; the "Point to add" flow.
- **Files:** `src/lib/mock/api.ts`, `src/lib/mock/propose-fields.ts`, `src/lib/api/builder.ts`, `src/features/document-types/sample/`
- **Accept:**
  - [x] "Point to add" switches the viewer to `select-words`; after confirming, a popover shows the guessed label, type and hint, all editable
  - [x] the new field appears in the list with its box and one example
  - [x] if the selection overlaps an existing field's box, the popover offers to fix that field instead
  - [x] every action except the pointing itself works from the keyboard; a field can always be added through 014's editor instead

### [ ] 3. Fix a field by pointing
- **Files:** `src/features/document-types/sample/`, `src/lib/fields/parse-field-value.ts`
- **Accept:**
  - [ ] "Point again" on a field replaces its example for this sample and updates its value
  - [ ] a field the AI didn't find shows "Not found: point to it" as its call to action

### [ ] 4. Table from a region
- **Build:** the `useSuggestTable()` hook and the `suggestTable` mock (columns from the header row, the first rows as a preview).
- **Files:** `src/lib/mock/api.ts`, `src/lib/api/builder.ts`, `src/features/document-types/sample/`
- **Accept:**
  - [ ] in `select-region`, a rectangle over a table creates a `table` field with columns guessed from the header row and a preview of the first rows
  - [ ] the columns can be renamed, retyped or removed in the editor from 014

### [ ] 5. Test run on more samples
- **Build:** tabs for samples 1–5. Adding a sample runs `testExtract` with the current draft (not saved yet). The `/types/:typeId/train` route loads the saved type into the draft.
- **Files:** `src/features/document-types/sample/`, `src/pages/types/train-type-page.tsx`, `src/app/router.tsx`
- **Accept:**
  - [ ] each field shows the value found and its confidence for the active sample; low confidence (`< LOW_CONFIDENCE`) and "not found" are flagged with an icon, not color alone
  - [ ] fixing by pointing on any sample adds an example (more samples → better hint); a short summary shows "12/14 fields found on all samples" and is announced (`role="status"`)
  - [ ] the sixth sample is refused with an explanation
  - [ ] after Save, every sample is assigned to the new type (`useReassignDocumentType()`) and shows up in the Inbox under it
  - [ ] Save goes through the same validation, impact dialog, versioning and leave guard as 014; `/types/:typeId/train` reopens this screen for an existing type

## Backend needs
OCR tokens right after upload; an LLM call that proposes fields (label, key, type, hint, bbox) for a sample; inference of label, type and hint from a selection plus its anchor; table columns and rows from a region; test extraction with an unsaved schema; examples passed to extraction as few-shot hints, including their bboxes as a "usually here" hint.

## Open questions
- Samples are uploaded as ordinary documents. Do they show up in the Inbox? **Decided:** yes: unclassified until the type is saved, then assigned to the new type (slice 5).
- Three panes at `lg` were tight (the viewer toolbar wrapped even at 1440px). **Decided:** three panes from `2xl` (the sidebar takes 240px, so `xl` was still tight at 1440px); at `lg` two panes, the viewer 3/5 wide, and the editor in the sheet. The viewer toolbar still wraps in a narrow column: make it compact (icon-only Rotate all) once 008 and 015 are merged, since the viewer is shared. A floating draggable panel was considered and dropped: it covers the boxes, needs a keyboard alternative and custom drag code.
- The mock `testExtract` ignored examples, so values could be unrelated to the box. **Fixed in slice 2** for text-like fields (the example's text, confidence 0.95); dates, money and numbers still come from the fake extractor until slice 3 parses them (`parse-field-value.ts`).
- A fresh upload gets one blank synthetic page with no tokens, so it only gets the fallback Title/Date/Total proposals without boxes; real proposals come from seeded documents (`?documentId=`).
- Values are read through `useTestExtractPreview(documentId, fields)`, a query over `testExtract` (it reruns when a field's type or hint changes, not on rename), instead of the `useTestExtract()` mutation, which would need an effect to fire.
- A field added by pointing isn't selected, so the editor doesn't open; the "Added …" status line confirms it instead. Select it automatically?
- A rejected field's box is ignored by the overlap check ("Fix … instead").
- 014's `FieldPatch` now also allows `examples`, so fixing an accepted field goes through `updateField`.
- How many examples per field are stored at most? **Decided:** one per sample, so at most 5 (see **Data**).
- Should corrections made in Review (008) add examples automatically or ask first? **Decided in 008 slice 3:** ask with a non-blocking prompt.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-23 | 2 | done | "Point to add" (header and empty state) → `select-words` → `useSuggestField()` (new mock `suggestField`: anchor label left or above, type from patterns incl. email/tax ID/number/phone) → an editable panel (label, type, hint; loading, error with retry) → Add; overlap offers "Fix <label> instead"; `testExtract` uses examples for text-like fields; preview key includes examples. Files: `features/document-types/sample/` (`use-point-to-add.ts`, `selection-overlap.ts`, `point-button.tsx`, `suggestion-panel.tsx`, `suggestion-form.tsx`, workspace, list, empty state), `lib/mock/api.ts`, `lib/mock/propose-fields.ts`, `lib/mock/types.ts`, `lib/api/builder.ts`, `features/document-types/type-draft.ts` |
| 2026-10-23 | 1 | done | upload or `?documentId=`, reading/proposing states, proposals with values and confidence, accept all / accept / reject / restore / inline rename, boxes linked to rows, 014 editor and save reused; `addFields` reducer action, `useTestExtractPreview`, viewer `scrollToHighlight(id, { focus })` (same change as 008), `--spacing-sample-pane` token; an "Add a field manually" button beyond the spec. Files: `pages/types/new-type-page.tsx`, `features/document-types/sample/`, `features/document-types/type-draft-reducer.ts`, `lib/api/builder.ts`, `features/documents/viewer/`, `styles/index.css` |
| 2026-10-23 | — | ready | approved; example limit decided; needs 014 merged before slice 1 |
| 2026-10-23 | — | reviewed | checked against product, conventions and process and against 014's code: the draft holds examples until Save, new suggestField/suggestTable hooks, values from testExtract, Files for every slice, error/empty states, the train route |
