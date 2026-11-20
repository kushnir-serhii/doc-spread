import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DiagramViewport } from '@/features/architecture/diagram-viewport'
import type { GlossaryKey } from '@/features/architecture/diagrams/glossary'
import { useMermaid } from '@/features/architecture/use-mermaid'

interface MermaidDiagramProps {
  code: string
  label: string
  description: string
  items: Record<string, GlossaryKey>
}

export const MermaidDiagram = ({ code, label, description, items }: MermaidDiagramProps) => {
  const { state, retry } = useMermaid(code)

  if (state.status === 'loading') {
    return <Skeleton className="h-80 w-full" role="status" aria-label={`Drawing ${label}`} />
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3 rounded-lg border border-danger bg-danger-soft p-4 text-danger-soft-foreground">
        <div role="alert" className="space-y-1">
          <p className="text-sm font-medium">The diagram could not be drawn.</p>
          <p className="text-sm break-words">{state.message}</p>
        </div>
        <Button type="button" variant="outline" className="min-h-touch" onClick={retry}>
          Retry
        </Button>
        <pre className="max-h-96 overflow-auto rounded-md bg-card p-3 font-mono text-xs text-foreground">{code}</pre>
      </div>
    )
  }

  return <DiagramViewport svg={state.svg} label={label} description={description} items={items} />
}
