import type { ReactNode } from 'react'
import type { ViewRotation } from './rotation'

interface PageOverlayProps {
  /** the UNROTATED page box in CSS px (page width/height x zoom) */
  width: number
  height: number
  rotation: ViewRotation
  /** place children in normalized page coordinates (left: x*100%, top: y*100%) */
  children?: ReactNode
}

/** One layer for everything drawn on a page. It rotates with the backdrop, so page coordinates hold at any angle. */
export const PageOverlay = ({ width, height, rotation, children }: PageOverlayProps) => (
  <div
    className="pointer-events-none absolute top-1/2 left-1/2"
    // dynamic size and angle: the unrotated page box, centred in the rotated page box
    style={{ width, height, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
  >
    {children}
  </div>
)
