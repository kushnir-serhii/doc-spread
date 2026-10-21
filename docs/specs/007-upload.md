# 007 — Upload

**Status:** draft · **Depends on:** 002 · **Route(s):** `/upload`

## Goal
The user drops several invoices (PDF/JPG/PNG), sees each file's progress, and knows when they are being processed.

## Scope
- In: drag-and-drop zone plus a file picker, type and size validation, per-file progress, per-file processing status, link to Inbox.
- Out: email forwarding, KSeF import, camera capture.

## Data
New mock `uploadInvoice(file, onProgress)` → `Invoice` with status `uploaded` → `processing`, plus the hook `useUploadInvoice()`.

## Slices

### [ ] 1. Drop zone + validation
- **Files:** `src/pages/upload/`, `src/features/upload/drop-zone.tsx`
- **Accept:**
  - [ ] drag-and-drop plus a keyboard-accessible "Choose files" button (a real `<input type="file" multiple accept>`)
  - [ ] wrong type or a too-large file is rejected per file with a reason; valid files still go through

### [ ] 2. Per-file progress
- **Build:** a file list whose state is a discriminated union per file: `queued | uploading(progress) | processing | done | failed(reason)`.
- **Accept:**
  - [ ] each file shows a progress bar with `aria-valuenow`; failures have retry and remove buttons
  - [ ] long file names truncate; 50 files stay usable

### [ ] 3. Processing handoff
- **Accept:**
  - [ ] once everything is uploaded: a summary ("8 processing, 1 failed") with a link to the Inbox
  - [ ] works at 375px

## Backend needs
Presigned upload URL, max file size, accepted MIME types, processing status (polling or a push channel).

## Open questions
- Max file size and pages per file?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
