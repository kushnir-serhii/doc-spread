import { placeBox } from './place-box'
import type { ViewerSelection } from './viewer-types'

interface SelectionLayerProps {
  selection: ViewerSelection
  /** the keyboard focus token is marked so the page can scroll it into view */
  focusTokenId: string | null
}

/** Selected tokens plus the wrapping rectangle, in page coordinates (inside PageOverlay). */
export const SelectionLayer = ({ selection, focusTokenId }: SelectionLayerProps) => (
  <>
    {selection.tokens.map((t) => (
      <div
        key={t.id}
        data-selection-focus={t.id === focusTokenId ? '' : undefined}
        className="absolute bg-selection-bg"
        // dynamic position: normalized page coordinates
        style={placeBox(t.bbox)}
      />
    ))}
    <div
      className="absolute rounded-xs border-2 border-selection-border"
      // dynamic position: normalized page coordinates
      style={placeBox(selection.bbox, { padded: true })}
    />
  </>
)
