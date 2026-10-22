# 013 — Document viewer

**Status:** in-progress · **Depends on:** 002, 012 · **Route(s):** — (component; demoed on `/design`)

## Goal
One component shows any document (a digital PDF, a scanned PDF, a photo), draws boxes where field values came from, and lets the user point at words or a region. The type builder (014, 015) and Review (008) both use it.

## Scope
- In: page rendering behind the `DocumentPage` contract, zoom, highlights, word selection that snaps to OCR tokens, a rectangle mode for tables.
- In (added): view-only page rotation in 90° steps.
- Out: annotations, saving a rotation, text search inside the document.

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

### [x] 2. Rotate view
- **Build:** a rotate button on each page (clockwise, 90° steps) and a "Rotate all" in the toolbar. View only: nothing is saved, and it resets when the document changes. The backdrop is rendered at the rotation (pdf.js `rotation` for PDFs, so it stays sharp; a CSS transform for images); the page box swaps width and height at 90°/270°. Everything drawn on a page (highlights, tokens, selections) lives in one overlay layer in page coordinates that rotates with the backdrop, plus one helper that maps view ↔ page coordinates for 0/90/180/270. Slices 3 and 4 use both.
- **Files:** `src/features/documents/viewer/`, the `/design` demo
- **Accept:**
  - [x] the sideways page 2 of the sample invoice reads upright after rotating it; the canvas is re-rendered (sharp), not a scaled bitmap
  - [x] fit width uses the widest page *after* rotation
  - [x] a page keeps its rotation while it scrolls out of the render window and back
  - [x] rotate buttons have an `aria-label` ("Rotate page 2"), 44px targets, and are reachable by keyboard; touch devices see them without hover

### [x] 3. Highlights
- **Build:** props `highlights: { id, page, bbox, tone, label }[]`, `activeHighlightId`, `onHighlightClick`. Boxes are positioned in % of the page, so zoom never shifts them. `scrollToHighlight(id)` through a ref.
- **Files:** `src/features/documents/viewer/`, `src/styles/index.css` (new highlight tokens go here first), the `/design` demo
- **Accept:**
  - [x] on the rotated mock page, the boxes line up with the text, both as delivered and after rotating it in the view
  - [x] tones come from design tokens in `src/styles/index.css` (normal / active / low confidence) and also differ by border style, not color alone
  - [x] each highlight is a focusable button with an `aria-label` ("Issue date: 12.03.2026")

### [ ] 4. Pointing: words + region
- **Build:** a `mode` prop: `view | select-words | select-region`. In `select-words`, a click picks a token and a drag or Shift+click extends the selection in reading order. In `select-region`, the user draws a rectangle. Either way it calls `onSelect({ page, bbox, tokens, text })`. Esc cancels.
- **Files:** `src/features/documents/viewer/`, the `/design` demo
- **Accept:**
  - [ ] the selection snaps to whole tokens; the combined bbox wraps them; it works the same on a page rotated in the view, and `onSelect` always gets page coordinates
  - [ ] keyboard: Tab into the page, arrows move between tokens, Shift+arrows extend, Enter confirms
  - [ ] the cursor and a hint bar make the active mode obvious

## Backend needs
For each document: the source file URL (CORS on the S3 bucket for pdf.js), or page images for scans and photos; OCR tokens with bboxes normalized after rotation; the page count and the size of each page.

## Open questions
- Is a thumbnail strip worth having for long documents?
- Do touch devices need pointing in the MVP, or is the builder desktop-only?

## Decisions
- Highlight boxes match the text and are not inflated to 44px (accepted exception to the touch-target rule); keyboard focus and a label list are the other way in.
- Highlight colours are fixed, not theme-flipped: the page is white in both themes.
- Rotation is view-only; it is never saved (no backend field).
- Fit width uses the widest page (after rotation), so nothing overflows sideways; a sideways page is fixed by rotating it, not by per-page fit.
- `sample-long.tokens.json` stays indented: it's mock-only, fetched on demand for `doc-028` only, and 45 KB gzipped (43 KB minified).
- Seed documents other than the sample-backed ones show the sample file of their kind under synthetic tokens, so their boxes won't match the backdrop (open question from 012). Accepted for the mocks; the viewer always sizes pages from `DocumentPage`, never from the file.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-23 | — | ready | checked against the code after 002: added the 30-page mock, the viewer's props and backdrop rule, the 002 dependency, Files lines, design-token wording |
| 2026-10-23 | 1 | done | `DocumentViewer` + toolbar/page/pdf canvas/image page/status, `useVisiblePages` (one IntersectionObserver, 1-viewport margin), `load-pdfjs` (pdf.js + worker as lazy chunks, one proxy per URL). Headless Chrome at DPR 2: ≤2 canvases of 30, canvas = 2× CSS size, no console errors, 375px dark OK. Fixed in review: fit width now uses the widest page (the rotated invoice page overflowed). 30-page `sample-long.pdf` + tokens from the generator, seed `doc-028`. `pdfjs-dist` added to conventions · `features/documents/viewer/*`, `pages/design/{design-page,viewer-section}.tsx`, `lib/mock/{documents-seed,pages}.ts`, `scripts/generate-mock-files.py`, `public/mock/sample-long*` |
| 2026-10-23 | — | rescoped | added slice 2 Rotate view (view-only, before highlights so they're built rotation-aware); highlights → 3, pointing → 4. Decided: fit width = widest page; token JSON stays indented |
| 2026-10-23 | 2 | done | Per-page rotate + "Rotate all" (view-only, reset on document change, kept above virtualization). PDF re-rendered at `page.rotate + view` (canvas 1784×2524 at DPR 2 after rotating, not scaled); images by CSS. `PageOverlay` (unrotated page box, rotates with the backdrop) and `rotation.ts` (`pageToView`/`viewToPage`/bbox variants, DEV round-trip check) for slices 3–4. `showTokens` prop + demo toggle: headless Chrome shows invoice page 2 upright and the receipt at 90° with OCR outlines on the words. Toolbar label is now "Document view" · `features/documents/viewer/{rotation,page-overlay,token-outlines,document-viewer,viewer-page,pdf-page-canvas,image-page,viewer-toolbar}`, `pages/design/viewer-section.tsx` |
| 2026-10-23 | 3 | done | `highlights`/`activeHighlightId`/`onHighlightClick`, `ref` → `scrollToHighlight` (scrolls to unrendered pages via `bboxToView`, then focuses the box). Tones: normal solid, low-confidence dashed (kept when active), active 2px + stronger fill; `--highlight-*` tokens. Fixed in review: `useDocumentType`/`useDocumentPages` take `null` and skip the request (`skipToken`), closing 002's guard question. Headless Chrome: jump to the sideways page focuses the box; it sits on "2026-10-14" as delivered and after rotating · `features/documents/viewer/{highlight-box,viewer-highlights,document-viewer,viewer-page}`, `styles/index.css`, `pages/design/{viewer-section,use-demo-highlights}`, `lib/api/{document-types,documents}.ts` |
