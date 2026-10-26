import type { BBox } from '@/lib/mock/types'

/**
 * Inline position for a box in normalized page coordinates (left: x*100% …), so zoom never shifts it.
 * `padded` grows the box by --spacing-highlight-pad on every side, so its border doesn't touch the text.
 */
export const placeBox = (b: BBox, { padded = false }: { padded?: boolean } = {}) => {
  const pad = padded ? 'var(--spacing-highlight-pad)' : '0px'
  return {
    left: `calc(${b.x * 100}% - ${pad})`,
    top: `calc(${b.y * 100}% - ${pad})`,
    width: `calc(${b.w * 100}% + 2 * ${pad})`,
    height: `calc(${b.h * 100}% + 2 * ${pad})`,
  }
}
