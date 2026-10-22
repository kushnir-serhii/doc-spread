import { useState } from 'react'
import { PageError, PageSkeleton } from './viewer-page-status'

interface ImagePageProps {
  src: string
  pageNumber: number
}

type ImageState = { step: 'loading' } | { step: 'ready' } | { step: 'error' }

export const ImagePage = ({ src, pageNumber }: ImagePageProps) => {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ImageState>({ step: 'loading' })

  return (
    <>
      <img
        key={attempt}
        src={src}
        alt={`Page ${pageNumber}`}
        draggable={false}
        className="absolute inset-0 size-full object-contain"
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
