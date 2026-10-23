import { useState } from 'react'
import type { ViewerZoom } from './viewer-types'

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const PAGE_PADDING = 32 // px: page-list padding (p-4 on both sides), subtracted for fit width

/** Zoom state and the derived scale. `widest` is the widest page after rotation, so nothing overflows sideways. */
export const useViewerZoom = (containerWidth: number, widest: number) => {
  const [zoom, setZoom] = useState<ViewerZoom>({ mode: 'fit' })
  const fitScale = Math.max(containerWidth - PAGE_PADDING, 0) / widest
  const scale = zoom.mode === 'fit' ? fitScale : zoom.value
  const stepZoom = (direction: 1 | -1) => {
    const next =
      direction === 1 ? ZOOM_STEPS.find((s) => s > scale + 0.001) : [...ZOOM_STEPS].reverse().find((s) => s < scale - 0.001)
    if (next) setZoom({ mode: 'scale', value: next })
  }
  return {
    scale,
    percent: Math.round(scale * 100),
    fit: zoom.mode === 'fit',
    canZoomOut: scale > ZOOM_STEPS[0] + 0.001,
    canZoomIn: scale < ZOOM_STEPS[ZOOM_STEPS.length - 1] - 0.001,
    onFit: () => setZoom({ mode: 'fit' }),
    onActualSize: () => setZoom({ mode: 'scale', value: 1 }),
    onZoomOut: () => stepZoom(-1),
    onZoomIn: () => stepZoom(1),
  }
}
