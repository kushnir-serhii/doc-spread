import type { BBox } from '@/lib/mock/types'

/** clockwise view rotation in degrees */
export type ViewRotation = 0 | 90 | 180 | 270

export interface Point {
  x: number
  y: number
}

/** the next 90° step clockwise */
export const nextRotation = (r: ViewRotation): ViewRotation => ((r + 90) % 360) as ViewRotation

/** size of the page box once rotated: width and height swap at 90° and 270° */
export const rotatedSize = (width: number, height: number, r: ViewRotation) =>
  r === 90 || r === 270 ? { width: height, height: width } : { width, height }

/** normalized page point (0..1, top-left of the unrotated page) -> normalized view point (the rotated box) */
export const pageToView = (p: Point, r: ViewRotation): Point => {
  switch (r) {
    case 0:
      return { x: p.x, y: p.y }
    case 90:
      return { x: 1 - p.y, y: p.x }
    case 180:
      return { x: 1 - p.x, y: 1 - p.y }
    case 270:
      return { x: p.y, y: 1 - p.x }
    default: {
      const unreachable: never = r
      return unreachable
    }
  }
}

/** inverse of pageToView */
export const viewToPage = (p: Point, r: ViewRotation): Point => {
  switch (r) {
    case 0:
      return { x: p.x, y: p.y }
    case 90:
      return { x: p.y, y: 1 - p.x }
    case 180:
      return { x: 1 - p.x, y: 1 - p.y }
    case 270:
      return { x: 1 - p.y, y: p.x }
    default: {
      const unreachable: never = r
      return unreachable
    }
  }
}

const mapBBox = (box: BBox, map: (p: Point) => Point): BBox => {
  const a = map({ x: box.x, y: box.y })
  const b = map({ x: box.x + box.w, y: box.y + box.h })
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

export const bboxToView = (box: BBox, r: ViewRotation): BBox => mapBBox(box, (p) => pageToView(p, r))

export const bboxToPage = (box: BBox, r: ViewRotation): BBox => mapBBox(box, (p) => viewToPage(p, r))

if (import.meta.env.DEV) {
  // no test runner: round-trip check for all four angles
  const sample: BBox = { x: 0.1, y: 0.2, w: 0.3, h: 0.1 }
  for (const r of [0, 90, 180, 270] as const) {
    const back = bboxToPage(bboxToView(sample, r), r)
    const ok = (Object.keys(sample) as (keyof BBox)[]).every((k) => Math.abs(back[k] - sample[k]) < 1e-9)
    if (!ok) throw new Error(`rotation.ts: view/page round trip failed at ${r}°`)
  }
}
