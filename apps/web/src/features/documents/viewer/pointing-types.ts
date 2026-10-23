import type { BBox } from '@/lib/mock/types'

/** words: token indexes in reading order; region: a drawn rectangle in page coordinates */
export type PointingSel = { kind: 'words'; anchor: number; focus: number } | { kind: 'region'; rect: BBox }

/** a selection is pending until confirmed (Enter / Confirm) or cancelled (Esc / Cancel) */
export type PointingState =
  | { step: 'idle' }
  | { step: 'selecting'; page: number; sel: PointingSel }
  | { step: 'pending'; page: number; sel: PointingSel }
