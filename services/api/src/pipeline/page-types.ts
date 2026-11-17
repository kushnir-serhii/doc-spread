// Mirrors Token, BBox and DocumentPage in apps/web/src/lib/mock/types.ts (the backend does not import from the web app).

/** Normalized to the page after rotation: 0..1, origin top-left. */
export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface Token {
  id: string
  text: string
  bbox: BBox
}

export interface OcrPage {
  index: number
  width: number
  height: number
  tokens: Token[]
  /** Set when the page could not be read (for example a scan without a working renderer). */
  note?: string
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))
const round = (value: number): number => Math.round(value * 1e5) / 1e5

/** A box from pixel/point edges, normalized by the page size and clamped to 0..1. */
export const normalizeBox = (left: number, top: number, right: number, bottom: number, pageWidth: number, pageHeight: number): BBox => {
  const x0 = clamp01(Math.min(left, right) / pageWidth)
  const y0 = clamp01(Math.min(top, bottom) / pageHeight)
  const x1 = clamp01(Math.max(left, right) / pageWidth)
  const y1 = clamp01(Math.max(top, bottom) / pageHeight)
  return { x: round(x0), y: round(y0), w: round(x1 - x0), h: round(y1 - y0) }
}

export const unionBox = (boxes: BBox[]): BBox | undefined => {
  if (boxes.length === 0) return undefined
  const x0 = Math.min(...boxes.map((box) => box.x))
  const y0 = Math.min(...boxes.map((box) => box.y))
  const x1 = Math.max(...boxes.map((box) => box.x + box.w))
  const y1 = Math.max(...boxes.map((box) => box.y + box.h))
  return { x: round(x0), y: round(y0), w: round(x1 - x0), h: round(y1 - y0) }
}

export const tokenId = (pageIndex: number, n: number): string => `p${pageIndex}w${n}`
