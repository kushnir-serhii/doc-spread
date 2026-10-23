# 015 — Type from a sample

**Status:** ready · **Depends on:** 013, 014 · **Route(s):** `/types/new?from=sample`, `/types/new?documentId=:id`, `/types/:typeId/train`

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

### [ ] 1. Sample + AI proposals
- **Build:** three panes: the viewer, the proposed fields (each with value, confidence and accept/reject buttons), and the field editor from 014. `/types/new` (014's page) opens this screen for `?from=sample` and `?documentId=`.
- **Files:** `src/pages/types/new-type-page.tsx`, `src/features/document-types/sample/`
- **Accept:**
  - [ ] upload one sample (or open with `?documentId=` from an unclassified document); a processing state with progress text while fields are proposed
  - [ ] upload and proposal errors show a message with retry; a sample with no proposals explains that and offers "Point to add"
  - [ ] hovering or focusing a field highlights its box and scrolls to it; clicking a box selects the field
  - [ ] "Accept all", plus Accept / Reject on each field; rejected fields can be restored; the user can rename them inline
  - [ ] desktop-first; below `lg` the panes stack

### [ ] 2. Add a field by pointing
- **Build:** the `useSuggestField()` hook and the `suggestField` mock; the "Point to add" flow.
- **Files:** `src/lib/mock/api.ts`, `src/lib/mock/propose-fields.ts`, `src/lib/api/builder.ts`, `src/features/document-types/sample/`
- **Accept:**
  - [ ] "Point to add" switches the viewer to `select-words`; after confirming, a popover shows the guessed label, type and hint, all editable
  - [ ] the new field appears in the list with its box and one example
  - [ ] if the selection overlaps an existing field's box, the popover offers to fix that field instead
  - [ ] every action except the pointing itself works from the keyboard; a field can always be added through 014's editor instead

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
  - [ ] Save goes through the same validation, impact dialog, versioning and leave guard as 014; `/types/:typeId/train` reopens this screen for an existing type

## Backend needs
OCR tokens right after upload; an LLM call that proposes fields (label, key, type, hint, bbox) for a sample; inference of label, type and hint from a selection plus its anchor; table columns and rows from a region; test extraction with an unsaved schema; examples passed to extraction as few-shot hints, including their bboxes as a "usually here" hint.

## Open questions
- Samples are uploaded as ordinary documents. Do they show up in the Inbox (as unclassified until the type is saved, then classified into it), or stay hidden as builder-only samples?
- How many examples per field are stored at most? **Decided:** one per sample, so at most 5 (see **Data**).
- Should corrections made in Review (008) add examples automatically or ask first? **Decided in 008 slice 3:** ask with a non-blocking prompt.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-23 | — | ready | approved; example limit decided; needs 014 merged before slice 1 |
| 2026-10-23 | — | reviewed | checked against product, conventions and process and against 014's code: the draft holds examples until Save, new suggestField/suggestTable hooks, values from testExtract, Files for every slice, error/empty states, the train route |
