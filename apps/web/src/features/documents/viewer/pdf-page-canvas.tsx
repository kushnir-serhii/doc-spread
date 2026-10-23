import { useEffect, useRef, useState } from 'react'
import { loadPdfDocument } from './load-pdfjs'
import type { ViewRotation } from './rotation'
import { PageError, PageSkeleton } from './viewer-page-status'

interface PdfPageCanvasProps {
  url: string
  /** 0-based; pdf.js page index + 1 */
  pageIndex: number
  /** the page box in CSS px (from DocumentPage width/height and the zoom) */
  boxWidth: number
  boxHeight: number
  /** the view rotation, added to the PDF page's own /Rotate */
  rotation: ViewRotation
}

type RenderState = { key: string; step: 'ready' | 'error' }

export const PdfPageCanvas = ({ url, pageIndex, boxWidth, boxHeight, rotation }: PdfPageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<RenderState | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: boxWidth, height: boxHeight })
  const key = `${url}|${pageIndex}|${boxWidth}|${boxHeight}|${rotation}|${attempt}`

  useEffect(() => {
    let cancelled = false
    let cancelRender: (() => void) | undefined
    const run = async () => {
      try {
        const pdf = await loadPdfDocument(url)
        const page = await pdf.getPage(pageIndex + 1)
        if (cancelled) return
        // pdf.js takes an absolute angle: the page's own /Rotate plus the view rotation (re-rendered, so it stays sharp)
        const angle = (page.rotate + rotation) % 360
        const natural = page.getViewport({ scale: 1, rotation: angle })
        // the PDF page may differ in aspect from the box: fit it inside
        const fit = Math.min(boxWidth / natural.width, boxHeight / natural.height)
        const dpr = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: fit * dpr, rotation: angle })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        setCanvasSize({ width: viewport.width / dpr, height: viewport.height / dpr })
        const task = page.render({ canvas, viewport })
        cancelRender = () => task.cancel()
        await task.promise
        if (!cancelled) setResult({ key, step: 'ready' })
      } catch {
        // a cancelled render (zoom change, unmount) is not an error
        if (!cancelled) setResult({ key, step: 'error' })
      }
    }
    void run()
    return () => {
      cancelled = true
      cancelRender?.()
    }
  }, [url, pageIndex, boxWidth, boxHeight, rotation, attempt, key])

  const step = result?.key === key ? result.step : 'loading'

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center bg-card">
        {/* dynamic size: set from the zoom and the PDF page, not expressible as a token */}
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: canvasSize.width, height: canvasSize.height }}
          aria-label={`Page ${pageIndex + 1}`}
        />
      </div>
      {step === 'loading' && <PageSkeleton />}
      {step === 'error' && <PageError pageNumber={pageIndex + 1} onRetry={() => setAttempt((n) => n + 1)} />}
    </>
  )
}
