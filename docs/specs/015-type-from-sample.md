# 015 — Type from a sample

**Status:** draft · **Depends on:** 013, 014 · **Route(s):** `/types/new?from=sample`, `/types/new?documentId=:id`, `/types/:typeId/train`

## Goal
The user builds a type by showing a real document instead of typing a schema: the AI proposes fields with boxes on the document, the user keeps, renames or removes them, points at anything that's missing or wrong, and test-runs the type on a second sample before saving.

## Scope
- In: uploading samples (or starting from an unclassified document), AI field proposals, adding a field by pointing, fixing a field by pointing, a table from a region, a test run on more samples.
- Out: a positional (fixed-layout) mode. Examples are semantic: the box is a hint and a few-shot example for the AI, not fixed coordinates.

## Data
`FieldDef.examples`, `FieldExample`, `useUploadDocument()`, `useProposeFields(documentId)`, `useTestExtract()`, `useAddFieldExample()`, `DocumentViewer` (013), the field editor from 014.

**How pointing works:** the selected tokens give `text` and a `bbox`, and the nearest label to the left or above gives `anchorText`. From those the mock guesses the label (from the anchor), the type (date/money/number/email/phone/tax ID patterns, otherwise text) and a hint. All of that is saved as a `FieldExample` on the field.

## Slices

### [ ] 1. Sample + AI proposals
- **Build:** three panes: the viewer, the proposed fields (each with value, confidence and accept/reject buttons), and the field editor from 014.
- **Accept:**
  - [ ] upload one sample (or open with `?documentId=` from an unclassified document); a processing state with progress text while fields are proposed
  - [ ] hovering or focusing a field highlights its box and scrolls to it; clicking a box selects the field
  - [ ] "Accept all" / "Reject" per field; rejected fields can be restored; the user can rename them inline

### [ ] 2. Add a field by pointing
- **Accept:**
  - [ ] "Point to add" switches the viewer to `select-words`; after confirming, a popover shows the guessed label, type and hint, all editable
  - [ ] the new field appears in the list with its box and one example
  - [ ] if the selection overlaps an existing field's box, the popover offers to fix that field instead

### [ ] 3. Fix a field by pointing
- **Accept:**
  - [ ] "Point again" on a field replaces its example for this sample and updates its value
  - [ ] a field the AI didn't find shows "Not found: point to it" as its call to action

### [ ] 4. Table from a region
- **Accept:**
  - [ ] in `select-region`, a rectangle over a table creates a `table` field with columns guessed from the header row and a preview of the first rows
  - [ ] the columns can be renamed, retyped or removed in the editor from 014

### [ ] 5. Test run on more samples
- **Build:** tabs for samples 1–5. Adding a sample runs `testExtract` with the current draft (not saved yet).
- **Accept:**
  - [ ] each field shows the value found and its confidence for the active sample; low confidence and "not found" are flagged
  - [ ] fixing by pointing on any sample adds an example (more samples → better hint); a short summary shows "12/14 fields found on all samples"
  - [ ] Save goes through the same validation and versioning as 014; `/types/:typeId/train` reopens this screen for an existing type

## Backend needs
OCR tokens right after upload; an LLM call that proposes fields (label, key, type, hint, bbox) for a sample; inference of label, type and hint from a selection plus its anchor; test extraction with an unsaved schema; examples passed to extraction as few-shot hints, including their bboxes as a "usually here" hint.

## Open questions
- How many examples per field are stored at most?
- Should corrections made in Review (008) add examples automatically or ask first?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
