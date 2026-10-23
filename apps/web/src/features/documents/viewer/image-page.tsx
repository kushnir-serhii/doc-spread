import { useState } from 'react'
import type { ViewRotation } from './rotation'
import { PageError, PageSkeleton } from './viewer-page-status'

interface ImagePageProps {
  src: string
  pageNumber: number
  /** the UNROTATED page box in CSS px */
  width: number
  height: number
  rotation: ViewRotation
}

type ImageState = { step: 'loading' } | { step: 'ready' } | { step: 'error' }

export const ImagePage = ({ src, pageNumber, width, height, rotation }: ImagePageProps) => {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ImageState>({ step: 'loading' })

  return (
    <>
      <img
        key={attempt}
        src={src}
        alt={`Page ${pageNumber}`}
        draggable={false}
        className="absolute top-1/2 left-1/2 object-contain"
        // dynamic size and angle: the unrotated page box, centred in the (swapped) page box, turned by CSS
        style={{ width, height, transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        onLoad={() => setState({ step: 'ready' })}
        onError={() => setState({ step: 'error' })}
      />
      {state.step === 'loading' && <PageSkeleton />}
      {state.step === 'error' && (
        <PageError
          pageNumber={pageNumber}
          onRetry={() => {
            setState({ step: 'loading' })
            setAttempt((n) => n + 1)
          }}
        />
      )}
    </>
  )
}
