import { useEffect, useId, useState } from 'react'
import { readMermaidTheme } from '@/features/architecture/mermaid-theme'
import { useTheme } from '@/lib/theme/theme-context'

export type MermaidState =
  | { status: 'loading' }
  | { status: 'ready'; svg: string }
  | { status: 'error'; message: string }

type Settled = Exclude<MermaidState, { status: 'loading' }>

// Wide diagrams keep their natural size and scroll inside their container.
const NO_MAX_WIDTH = { useMaxWidth: false }

/** Renders a Mermaid definition to SVG. Mermaid is loaded with a dynamic import so it stays out of the main chunk. */
export const useMermaid = (code: string) => {
  const { resolvedTheme } = useTheme()
  const reactId = useId()
  const [attempt, setAttempt] = useState(0)
  // The result is stored with the inputs it was made for; a result for other inputs counts as loading.
  const [result, setResult] = useState<{ key: string; state: Settled } | null>(null)

  const key = `${resolvedTheme}\n${attempt}\n${code}`

  useEffect(() => {
    let cancelled = false
    const domId = `mermaid-${reactId.replace(/:/g, '')}-${attempt}`

    const run = async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        if (cancelled) return
        // Read the tokens after the import, so the root element already carries the current theme class.
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: readMermaidTheme(resolvedTheme === 'dark'),
          flowchart: NO_MAX_WIDTH,
          class: NO_MAX_WIDTH,
          state: NO_MAX_WIDTH,
          sequence: NO_MAX_WIDTH,
        })
        const { svg } = await mermaid.render(domId, code)
        if (!cancelled) setResult({ key, state: { status: 'ready', svg } })
      } catch (error) {
        // A failed render can leave its temporary element in <body>.
        document.getElementById(domId)?.remove()
        document.getElementById(`d${domId}`)?.remove()
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'The diagram could not be drawn.'
          setResult({ key, state: { status: 'error', message } })
        }
      }
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [code, resolvedTheme, attempt, reactId, key])

  const state: MermaidState = result && result.key === key ? result.state : { status: 'loading' }
  const retry = () => setAttempt((value) => value + 1)

  return { state, retry }
}
