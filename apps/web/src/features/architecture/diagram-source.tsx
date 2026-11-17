import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DiagramSourceProps {
  code: string
}

type CopyState = 'idle' | 'copied' | 'failed'

const COPY_MESSAGES: Record<CopyState, string> = {
  idle: '',
  copied: 'Copied',
  failed: 'Could not copy. Select the text and copy it by hand.',
}

export const DiagramSource = ({ code }: DiagramSourceProps) => {
  const [copy, setCopy] = useState<CopyState>('idle')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <details className="rounded-lg border bg-card">
      <summary className="flex min-h-touch items-center px-4 text-sm font-medium">Diagram source</summary>
      <div className="space-y-3 border-t p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" className="min-h-touch" onClick={handleCopy}>
            Copy
          </Button>
          <p role="status" className="text-sm text-muted-foreground">
            {COPY_MESSAGES[copy]}
          </p>
        </div>
        <pre
          tabIndex={0}
          className="max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"
        >
          {code}
        </pre>
      </div>
    </details>
  )
}
