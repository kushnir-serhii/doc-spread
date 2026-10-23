import type { BBox, Token } from '@/lib/mock/types'
import { bboxToView, type Point, type ViewRotation } from './rotation'

const centre = (b: BBox): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })

const contains = (b: BBox, p: Point) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h

/** index of the token under a page-coordinate point, or null */
export const tokenAt = (tokens: Token[], p: Point): number | null => {
  const i = tokens.findIndex((t) => contains(t.bbox, p))
  return i < 0 ? null : i
}

/** indexes (reading order) of tokens whose centre lies inside the rectangle */
export const tokensInRect = (tokens: Token[], rect: BBox): number[] =>
  tokens.flatMap((t, i) => (contains(rect, centre(t.bbox)) ? [i] : []))

export const rectFromPoints = (a: Point, b: Point): BBox => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
})

export const unionBBox = (boxes: BBox[]): BBox => {
  const x0 = Math.min(...boxes.map((b) => b.x))
  const y0 = Math.min(...boxes.map((b) => b.y))
  const x1 = Math.max(...boxes.map((b) => b.x + b.w))
  const y1 = Math.max(...boxes.map((b) => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * The token on the visual line above/below, nearest horizontally. Works in VIEW coordinates, so arrows
 * match what the user sees on a rotated page. Returns null when there is no line in that direction.
 */
export const nearestOnAdjacentLine = (
  tokens: Token[],
  from: number,
  rotation: ViewRotation,
  direction: 'up' | 'down',
): number | null => {
  const views = tokens.map((t) => bboxToView(t.bbox, rotation))
  const origin = views[from]
  if (!origin) return null
  const c = centre(origin)
  const sign = direction === 'down' ? 1 : -1
  const ahead = views.flatMap((v, i) => {
    const dy = (centre(v).y - c.y) * sign
    return dy > origin.h / 2 ? [{ i, dy, dx: Math.abs(centre(v).x - c.x) }] : []
  })
  if (ahead.length === 0) return null
  const lineDy = Math.min(...ahead.map((a) => a.dy))
  // the nearest line = everything within half a token height of the closest one
  const line = ahead.filter((a) => a.dy <= lineDy + origin.h / 2)
  return line.reduce((best, a) => (a.dx < best.dx ? a : best)).i
}

if (import.meta.env.DEV) {
  // no test runner: two lines of two tokens, checked as delivered and rotated 90 degrees
  const box = (x: number, y: number): Token => ({ id: `${x}-${y}`, text: '', bbox: { x, y, w: 0.1, h: 0.05 } })
  const grid = [box(0.1, 0.1), box(0.3, 0.1), box(0.1, 0.2), box(0.3, 0.2)] // A B / C D
  const ok =
    nearestOnAdjacentLine(grid, 0, 0, 'down') === 2 &&
    nearestOnAdjacentLine(grid, 3, 0, 'up') === 1 &&
    nearestOnAdjacentLine(grid, 0, 0, 'up') === null &&
    // at 90 degrees the view lines are A,C and B,D
    nearestOnAdjacentLine(grid, 0, 90, 'down') === 1 &&
    nearestOnAdjacentLine(grid, 3, 90, 'up') === 2
  if (!ok) throw new Error('token-hit-test.ts: nearestOnAdjacentLine check failed')
}
