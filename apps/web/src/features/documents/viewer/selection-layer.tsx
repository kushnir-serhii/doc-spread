import type { BBox } from '@/lib/mock/types'
import type { ViewerSelection } from './viewer-types'

interface SelectionLayerProps {
  selection: ViewerSelection
  /** the keyboard focus token is marked so the page can scroll it into view */
  focusTokenId: string | null
}

const place = (b: BBox) => ({
  left: `${b.x * 100}%`,
  top: `${b.y * 100}%`,
  width: `${b.w * 100}%`,
  height: `${b.h * 100}%`,
})

/** Selected tokens plus the wrapping rectangle, in page coordinates (inside PageOverlay). */
export const SelectionLayer = ({ selection, focusTokenId }: SelectionLayerProps) => (
  <>
    {selection.tokens.map((t) => (
      <div
        key={t.id}
        data-selection-focus={t.id === focusTokenId ? '' : undefined}
        className="absolute bg-selection-bg"
        // dynamic position: normalized page coordinates
        style={place(t.bbox)}
      />
    ))}
    <div
      className="absolute rounded-xs border-2 border-selection-border"
      // dynamic position: normalized page coordinates
      style={place(selection.bbox)}
    />
  </>
)
