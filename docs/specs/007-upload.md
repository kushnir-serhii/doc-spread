# 007 — Upload

**Status:** in-progress · **Depends on:** 002, 012 · **Route(s):** `/upload`

## Goal
The user drops several documents of any kind (PDF/JPG/PNG), sees each file's progress, and learns what type the AI assigned to each one, or that it couldn't tell.

## Scope
- In: drag-and-drop zone plus a file picker, type and size validation, per-file progress, per-file processing and classification result, an optional "all of these are type X" choice, links to the Inbox.
- Out: email forwarding, KSeF import, camera capture.

## Data
`useUploadDocument()` (statuses `uploaded → processing → needs_review | unclassified`), `useDocument(id)` (polls while processing), `useDocumentTypes()`.

Accepted: `.pdf`, `.jpg`/`.jpeg`, `.png`; max 20 MB per file (`MAX_UPLOAD_BYTES`, mock value until the backend sets it).

## Slices

### [x] 1. Drop zone + validation
- **Files:** `src/pages/upload/`, `src/features/upload/drop-zone.tsx`
- **Accept:**
  - [x] drag-and-drop plus a keyboard-accessible "Choose files" button (a real `<input type="file" multiple accept>`)
  - [x] a wrong file type or a too-large file is rejected per file with a reason; valid files still go through
  - [x] an optional "Type" select, defaulting to "Detect automatically"; `?type=` preselects it

### [x] 2. Per-file progress
- **Build:** the mock gains `uploadDocument(file, { typeId?, onProgress? })`: simulated upload progress, and a chosen type skips classification and goes straight to extraction; `useUploadDocument()` passes both through. A file list whose state is a discriminated union per file: `queued | uploading(progress) | processing | classified(typeName) | unclassified | failed(reason)`.
- **Accept:**
  - [x] each file shows a progress bar with `aria-valuenow`; failures have retry and remove buttons
  - [x] a classified file shows its type name; an unclassified one links to "Assign type"
  - [x] long file names truncate; 50 files stay usable

### [ ] 3. Processing handoff
- **Accept:**
  - [ ] once everything is uploaded: a summary ("6 classified, 2 unclassified, 1 failed") with links to the Inbox, filtered where it helps (`?type=unclassified`)
  - [ ] if the user has no types yet: a suggestion to make a type from one of the uploaded files (015)
  - [ ] works at 375px

## Backend needs
Presigned upload URL, max file size, accepted MIME types; classification against the user's types (descriptions + examples) with a confidence threshold; processing status (polling or a push channel).

## Open questions
- Max file size and pages per file? 20 MB for the mock; pages per file not limited yet.
- What is the confidence threshold below which a document stays unclassified?
- A file removed mid-upload still finishes on the server (no cancel API yet), and retrying after a failed status poll re-uploads the file (possible duplicate). Backend: cancel upload, idempotent upload key?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-22 | — | rescoped | any document type; auto-classification with an optional manual type |
| 2026-10-23 | — | ready | checked against the code: accepted types and a 20 MB mock limit, `uploadDocument` gains `typeId` + `onProgress` in slice 2 (it had neither), per-file status via `useDocument(id)` |
| 2026-10-23 | 1 | done | Drop zone (whole-zone drop, drag-over state) + "Choose files" button on a real `<input type="file" multiple accept>`; `validateFile` rejects per file ("Only PDF, JPG or PNG", "Larger than 20 MB", also empty files) and valid files list as ready (removable, `queued` entries for slice 2); result announced in `role="status"`. Native `<select>` for Type ("Detect automatically" first, `?type=` synced, unknown id falls back), types error with retry. Nothing uploads yet. Fixed in review: heading ids from `useId`. Headless Chrome: 1280 dark, 375 light/dark · `pages/upload/upload-page.tsx`, `features/upload/{upload-rules,upload-entries,format-file-size,drop-zone,type-select,file-list,file-row}`, `app/router.tsx` |
| 2026-10-23 | 2 | done | Mock `uploadDocument(file, { typeId?, onProgress? })`: simulated transfer (5–8 ticks), a chosen type skips classification, names containing "fail" fail mid-transfer (no random failures); `useUploadDocument` passes both, `useDocumentsByIds` (`useQueries`, same keys/polling). `useUploadQueue` (3 at a time, type read when a file starts), client phase `queued/uploading/uploaded/failed` + polled document → `deriveFileState` display union; row with progressbar (`aria-valuenow` while uploading, indeterminate while processing), Open / Assign type links, Retry + Remove (44px, named); one `role="status"` summary. Headless Chrome (CDP), 7 files incl. a .txt, a long name and `fail-*`: progress mid-upload 1280, finished 375 dark, `?type=` Receipt → classified as Receipt · `lib/mock/api.ts`, `lib/api/documents.ts`, `features/upload/{file-state,use-upload-queue,use-file-states,upload-row,upload-progress,upload-entries,file-list}`, `pages/upload/upload-page.tsx` |
