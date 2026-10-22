# 013 — Document viewer

**Status:** in-progress · **Depends on:** 002, 012 · **Route(s):** — (component; demoed on `/design`)

## Goal
One component shows any document (a digital PDF, a scanned PDF, a photo), draws boxes where field values came from, and lets the user point at words or a region. The type builder (014, 015) and Review (008) both use it.

## Scope
- In: page rendering behind the `DocumentPage` contract, zoom, highlights, word selection that snaps to OCR tokens, a rectangle mode for tables.
- Out: annotations, rotating pages in the UI, text search inside the document.

## Data
`DocumentPage`, `Token`, `BBox`, `getDocumentPages(id)` through `useDocumentPages(id)` (002). New dependency: `pdfjs-dist` (approved).

**Props:** `DocumentViewer({ documentId, file })` with `file: Document['file']`. Pages come from `useDocumentPages(documentId)`; the `DocumentPage` list (not `file.pageCount`, not the PDF) decides how many pages there are and the size of each (already after rotation). Backdrop: `file.type === 'pdf'` → pdf.js renders page `index + 1` of `file.url` into that box; `jpg`/`png` → `page.imageUrl`.

**Contract:** the viewer only knows pages and normalized boxes. Digital PDFs get their backdrop from pdf.js (sharp at any zoom); scans and photos use `imageUrl`. The overlay of boxes and tokens is the same for both. Tokens always come from the backend, never from the pdf.js text layer, so PDFs, scans and photos behave alike.

## Slices

### [x] 1. Pages + zoom
- **Build:** first extend `apps/web/scripts/generate-mock-files.py` to produce a 30-page `public/mock/sample-long.pdf` (no real data) with its token JSON, and add one seed document backed by it. Then a `DocumentViewer` with a vertical page list. Add `pdfjs-dist` (and list it under **Stack** in `docs/conventions.md`) with its worker imported via `?url`, loaded lazily so it only lands in chunks that use the viewer. Only visible pages are rendered (IntersectionObserver); others are placeholders sized from `width/height`. Zoom: fit width, 100%, +/−.
- **Files:** `src/features/documents/viewer/`, `scripts/generate-mock-files.py`, `public/mock/sample-long*`, `src/lib/mock/{documents-seed,pages}.ts`, the `/design` demo
- **Accept:**
  - [x] the 30-page mock PDF scrolls smoothly; no canvases exist for pages far off-screen
  - [x] HiDPI screens get sharp canvases (device pixel ratio)
  - [x] the build shows pdf.js only in the viewer's chunk; skeleton while a page renders; error with retry

### [ ] 2. Highlights
- **Build:** props `highlights: { id, page, bbox, tone, label }[]`, `activeHighlightId`, `onHighlightClick`. Boxes are positioned in % of the page, so zoom never shifts them. `scrollToHighlight(id)` through a ref.
- **Files:** `src/features/documents/viewer/`, `src/styles/index.css` (new highlight tokens go here first), the `/design` demo
- **Accept:**
  - [ ] on the rotated mock page, the boxes line up with the text
  - [ ] tones come from design tokens in `src/styles/index.css` (normal / active / low confidence) and also differ by border style, not color alone
  - [ ] each highlight is a focusable button with an `aria-label` ("Issue date: 12.03.2026")

### [ ] 3. Pointing: words + region
- **Build:** a `mode` prop: `view | select-words | select-region`. In `select-words`, a click picks a token and a drag or Shift+click extends the selection in reading order. In `select-region`, the user draws a rectangle. Either way it calls `onSelect({ page, bbox, tokens, text })`. Esc cancels.
- **Files:** `src/features/documents/viewer/`, the `/design` demo
- **Accept:**
  - [ ] the selection snaps to whole tokens; the combined bbox wraps them
  - [ ] keyboard: Tab into the page, arrows move between tokens, Shift+arrows extend, Enter confirms
  - [ ] the cursor and a hint bar make the active mode obvious

## Backend needs
For each document: the source file URL (CORS on the S3 bucket for pdf.js), or page images for scans and photos; OCR tokens with bboxes normalized after rotation; the page count and the size of each page.

## Open questions
- Fit width uses the widest page, so on a document with a landscape page the portrait pages show narrower than the container. Per-page fit instead?
- `sample-long.tokens.json` is 793 KB (indented like the others). Minify the generated token JSON?
- Is a thumbnail strip worth having for long documents?
- Do touch devices need pointing in the MVP, or is the builder desktop-only?

## Decisions
- Seed documents other than the sample-backed ones show the sample file of their kind under synthetic tokens, so their boxes won't match the backdrop (open question from 012). Accepted for the mocks; the viewer always sizes pages from `DocumentPage`, never from the file.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-23 | — | ready | checked against the code after 002: added the 30-page mock, the viewer's props and backdrop rule, the 002 dependency, Files lines, design-token wording |
| 2026-10-23 | 1 | done | `DocumentViewer` + toolbar/page/pdf canvas/image page/status, `useVisiblePages` (one IntersectionObserver, 1-viewport margin), `load-pdfjs` (pdf.js + worker as lazy chunks, one proxy per URL). Headless Chrome at DPR 2: ≤2 canvases of 30, canvas = 2× CSS size, no console errors, 375px dark OK. Fixed in review: fit width now uses the widest page (the rotated invoice page overflowed). 30-page `sample-long.pdf` + tokens from the generator, seed `doc-028`. `pdfjs-dist` added to conventions · `features/documents/viewer/*`, `pages/design/{design-page,viewer-section}.tsx`, `lib/mock/{documents-seed,pages}.ts`, `scripts/generate-mock-files.py`, `public/mock/sample-long*` |
