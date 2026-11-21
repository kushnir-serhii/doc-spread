import { Hourglass } from 'lucide-react'

import { DiagramItemsList } from '@/features/architecture/diagram-items-list'
import { DiagramSource } from '@/features/architecture/diagram-source'
import type { DiagramDef } from '@/features/architecture/diagrams/diagram-def'
import { MermaidDiagram } from '@/features/architecture/mermaid-diagram'

interface DiagramPanelProps {
  diagram: DiagramDef
}

export const DiagramPanel = ({ diagram }: DiagramPanelProps) => (
  <div className="space-y-4">
    <header className="space-y-1">
      <h2 className="text-lg font-semibold">{diagram.label}</h2>
      <p className="text-sm font-medium text-muted-foreground">{diagram.kind}</p>
      <p className="text-sm text-muted-foreground">{diagram.description}</p>
    </header>
    <section aria-label="Sources" className="space-y-1">
      <h3 className="text-sm font-medium">Sources</h3>
      <ul className="space-y-1">
        {diagram.sources.map((source) => (
          <li key={source} className="font-mono text-xs break-all text-muted-foreground">
            {source}
          </li>
        ))}
      </ul>
    </section>
    {diagram.planned && (
      <p className="flex items-center gap-2 rounded-lg border border-warning bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
        <Hourglass className="size-4 shrink-0" aria-hidden="true" />
        Planned (spec {diagram.planned.spec}): not built yet
      </p>
    )}
    {diagram.code ? (
      <>
        <MermaidDiagram code={diagram.code} label={diagram.label} description={diagram.description} items={diagram.items} />
        <DiagramItemsList items={diagram.items} />
        <DiagramSource code={diagram.code} />
      </>
    ) : (
      <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed bg-muted p-6 text-center text-sm text-muted-foreground">
        This diagram comes in a later slice.
      </div>
    )}
  </div>
)
