import type { GlossaryKey } from './glossary'

export const DIAGRAM_IDS = ['context', 'structure', 'domain', 'screens', 'lifecycle', 'pipeline', 'deployment', 'delivery'] as const

export type DiagramId = (typeof DIAGRAM_IDS)[number]

export interface DiagramDef {
  /** Also the `?tab=` value. */
  id: DiagramId
  /** Tab label. */
  label: string
  /** UML diagram type shown under the title. */
  kind: string
  /** What the diagram shows and where the truth lives. */
  description: string
  /** Repo paths the diagram was drawn from. */
  sources: string[]
  /** Mermaid definition. */
  code: string
  /** Mermaid node id to glossary entry; every node in code has one. */
  items: Record<string, GlossaryKey>
  /** Set while the diagram shows something not built yet; `spec` is the spec number that builds it. */
  planned?: { spec: string }
}
