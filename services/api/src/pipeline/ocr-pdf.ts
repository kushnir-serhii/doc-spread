import { createCanvas } from '@napi-rs/canvas'
import { PermanentError } from './queue.js'
import { recognizeImage } from './ocr-image.js'
import { normalizeBox, tokenId, type OcrPage, type Token } from './page-types.js'

/** Spec 007 recommendation, revisited with real results: longer files are refused, not half-read. */
export const MAX_PAGES = 50
/** Scans are rendered at 2x (about 144 dpi) before Tesseract reads them. */
const SCAN_SCALE = 2

type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfjs: Promise<PdfjsModule> | undefined
// pdfjs-dist stays outside the bundle (its worker file is loaded by path), so it is imported lazily.
const loadPdfjs = (): Promise<PdfjsModule> => {
  pdfjs ??= import('pdfjs-dist/legacy/build/pdf.mjs')
  return pdfjs
}

interface TextItemLike {
  str: string
  transform: number[]
  width: number
  height: number
}
const isTextItem = (item: unknown): item is TextItemLike =>
  typeof item === 'object' && item !== null && 'str' in item && 'transform' in item && 'width' in item && 'height' in item

type Matrix = [number, number, number, number, number, number]
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

/** Words of the page's text layer. Each text item is split on spaces; the item's width is shared by character count. */
const wordsOf = (items: unknown[], viewport: { transform: number[]; width: number; height: number }, pageIndex: number): Token[] => {
  const view = viewport.transform as Matrix // a 6-number affine matrix by pdfjs's contract
  const tokens: Token[] = []
  for (const item of items) {
    if (!isTextItem(item) || item.str.trim() === '') continue
    const [a = 0, b = 0, , , originX = 0, originY = 0] = item.transform
    const scale = Math.hypot(a, b)
    if (scale === 0) continue
    // Unit vectors along the baseline and "up", in PDF user space: robust to rotated text and pages.
    const ux = a / scale
    const uy = b / scale
    const vx = -uy
    const vy = ux
    for (const match of item.str.matchAll(/\S+/g)) {
      const start = (match.index / item.str.length) * item.width
      const end = ((match.index + match[0].length) / item.str.length) * item.width
      const corners = [
        [start, 0],
        [end, 0],
        [start, item.height],
        [end, item.height],
      ].map(([along = 0, up = 0]) => apply(view, originX + ux * along + vx * up, originY + uy * along + vy * up))
      const xs = corners.map(([x = 0]) => x)
      const ys = corners.map(([, y = 0]) => y)
      tokens.push({
        id: tokenId(pageIndex, tokens.length),
        text: match[0],
        bbox: normalizeBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), viewport.width, viewport.height),
      })
    }
  }
  return tokens
}

/**
 * Reads a PDF: the text layer where there is one, Tesseract on the rendered page where there is not.
 * Throws PermanentError for a file that cannot be parsed.
 */
export const readPdf = async (bytes: Uint8Array): Promise<OcrPage[]> => {
  const lib = await loadPdfjs()
  // pdfjs refuses a Buffer and takes ownership of the array it gets, so it gets a copy as a plain Uint8Array.
  const task = lib.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 })
  let pdf
  try {
    pdf = await task.promise
  } catch (error) {
    await task.destroy()
    throw new PermanentError(`unreadable PDF: ${error instanceof Error ? error.name : 'parse error'}`)
  }
  if (pdf.numPages > MAX_PAGES) {
    await task.destroy()
    throw new PermanentError(`too many pages (limit ${MAX_PAGES})`)
  }
  const pages: OcrPage[] = []
  try {
    for (let n = 1; n <= pdf.numPages; n += 1) {
      const index = n - 1
      const page = await pdf.getPage(n)
      const viewport = page.getViewport({ scale: 1 }) // applies the page's /Rotate
      const content = await page.getTextContent()
      const tokens = wordsOf(content.items, viewport, index)
      if (tokens.length > 0) {
        pages.push({ index, width: viewport.width, height: viewport.height, tokens })
        continue
      }
      // No text layer: a scan. Render, then OCR.
      const scaled = page.getViewport({ scale: SCAN_SCALE })
      const canvas = createCanvas(Math.ceil(scaled.width), Math.ceil(scaled.height))
      // @napi-rs/canvas implements the 2D context pdfjs needs; the types differ only in browser-only members.
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport: scaled }).promise
      const recognized = await recognizeImage(canvas.toBuffer('image/png'), index)
      // Keep the page size in PDF points like the digital pages; boxes are normalized, so they stay valid.
      pages.push({ ...recognized, width: viewport.width, height: viewport.height })
    }
  } finally {
    await task.destroy()
  }
  return pages
}
