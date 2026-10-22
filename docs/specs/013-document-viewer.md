# 013 — Document viewer

**Status:** draft · **Depends on:** 012 · **Route(s):** — (component; demoed on `/design`)

## Goal
One component shows any document (a digital PDF, a scanned PDF, a photo), draws boxes where field values came from, and lets the user point at words or a region. The type builder (014, 015) and Review (008) both use it.

## Scope
- In: page rendering behind the `DocumentPage` contract, zoom, highlights, word selection that snaps to OCR tokens, a rectangle mode for tables.
- Out: annotations, rotating pages in the UI, text search inside the document.

## Data
`DocumentPage`, `Token`, `BBox`, `getDocumentPages(id)` through `useDocumentPages(id)` (002). New dependency: `pdfjs-dist` (approved).

**Contract:** the viewer only knows pages and normalized boxes. Digital PDFs get their backdrop from pdf.js (sharp at any zoom); scans and photos use `imageUrl`. The overlay of boxes and tokens is the same for both. Tokens always come from the backend, never from the pdf.js text layer, so PDFs, scans and photos behave alike.

## Slices

### [ ] 1. Pages + zoom
- **Build:** a `DocumentViewer` with a vertical page list. Add `pdfjs-dist` with its worker imported via `?url`, loaded lazily so it only lands in chunks that use the viewer. Only visible pages are rendered (IntersectionObserver); others are placeholders sized from `width/height`. Zoom: fit width, 100%, +/−.
- **Files:** `src/features/documents/viewer/`
- **Accept:**
  - [ ] the 30-page mock PDF scrolls smoothly; no canvases exist for pages far off-screen
  - [ ] HiDPI screens get sharp canvases (device pixel ratio)
  - [ ] the build shows pdf.js only in the viewer's chunk; skeleton while a page renders; error with retry

### [ ] 2. Highlights
- **Build:** props `highlights: { id, page, bbox, tone, label }[]`, `activeHighlightId`, `onHighlightClick`. Boxes are positioned in % of the page, so zoom never shifts them. `scrollToHighlight(id)` through a ref.
- **Accept:**
  - [ ] on the rotated mock page, the boxes line up with the text
  - [ ] tones come from tokens (normal / active / low confidence) and also differ by border style, not color alone
  - [ ] each highlight is a focusable button with an `aria-label` ("Issue date: 12.03.2026")

### [ ] 3. Pointing: words + region
- **Build:** a `mode` prop: `view | select-words | select-region`. In `select-words`, a click picks a token and a drag or Shift+click extends the selection in reading order. In `select-region`, the user draws a rectangle. Either way it calls `onSelect({ page, bbox, tokens, text })`. Esc cancels.
- **Accept:**
  - [ ] the selection snaps to whole tokens; the combined bbox wraps them
  - [ ] keyboard: Tab into the page, arrows move between tokens, Shift+arrows extend, Enter confirms
  - [ ] the cursor and a hint bar make the active mode obvious

## Backend needs
For each document: the source file URL (CORS on the S3 bucket for pdf.js), or page images for scans and photos; OCR tokens with bboxes normalized after rotation; the page count and the size of each page.

## Open questions
- Is a thumbnail strip worth having for long documents?
- Do touch devices need pointing in the MVP, or is the builder desktop-only?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
