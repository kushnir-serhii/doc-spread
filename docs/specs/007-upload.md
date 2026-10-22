# 007 — Upload

**Status:** draft · **Depends on:** 002, 012 · **Route(s):** `/upload`

## Goal
The user drops several documents of any kind (PDF/JPG/PNG), sees each file's progress, and learns what type the AI assigned to each one, or that it couldn't tell.

## Scope
- In: drag-and-drop zone plus a file picker, type and size validation, per-file progress, per-file processing and classification result, an optional "all of these are type X" choice, links to the Inbox.
- Out: email forwarding, KSeF import, camera capture.

## Data
`useUploadDocument()` (statuses `uploaded → processing → needs_review | unclassified`), `useDocumentTypes()`.

## Slices

### [ ] 1. Drop zone + validation
- **Files:** `src/pages/upload/`, `src/features/upload/DropZone.tsx`
- **Accept:**
  - [ ] drag-and-drop plus a keyboard-accessible "Choose files" button (a real `<input type="file" multiple accept>`)
  - [ ] a wrong file type or a too-large file is rejected per file with a reason; valid files still go through
  - [ ] an optional "Type" select, defaulting to "Detect automatically"; `?type=` preselects it

### [ ] 2. Per-file progress
- **Build:** a file list whose state is a discriminated union per file: `queued | uploading(progress) | processing | classified(typeName) | unclassified | failed(reason)`.
- **Accept:**
  - [ ] each file shows a progress bar with `aria-valuenow`; failures have retry and remove buttons
  - [ ] a classified file shows its type name; an unclassified one links to "Assign type"
  - [ ] long file names truncate; 50 files stay usable

### [ ] 3. Processing handoff
- **Accept:**
  - [ ] once everything is uploaded: a summary ("6 classified, 2 unclassified, 1 failed") with links to the Inbox, filtered where it helps (`?type=unclassified`)
  - [ ] if the user has no types yet: a suggestion to make a type from one of the uploaded files (015)
  - [ ] works at 375px

## Backend needs
Presigned upload URL, max file size, accepted MIME types; classification against the user's types (descriptions + examples) with a confidence threshold; processing status (polling or a push channel).

## Open questions
- Max file size and pages per file?
- What is the confidence threshold below which a document stays unclassified?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | any document type; auto-classification with an optional manual type |
