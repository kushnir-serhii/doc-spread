import type { GlossaryKey } from '@/features/architecture/diagrams/glossary'

export const ITEM_ATTRIBUTE = 'data-diagram-item'

export interface ResolvedItem {
  /** Mermaid node id. */
  nodeId: string
  key: GlossaryKey
  element: SVGGElement
  /** False for the repeated actor box at the bottom of a sequence diagram: clickable, but not a second tab stop. */
  focusable: boolean
}

// Mermaid 12 ids: `<svg id>-flowchart-<id>-<n>`, `...-state-<id>-<n>`, `...-classId-<id>-<n>`.
const NODE_ID = /-(?:flowchart|state|classId)-(.+)-\d+$/

/** Flowchart, state and class nodes (`g.node`) and sequence participants (actor boxes), by Mermaid id. */
const findNodes = (root: Element): { nodeId: string; element: SVGGElement; focusable: boolean }[] => {
  const found: { nodeId: string; element: SVGGElement; focusable: boolean }[] = []
  root.querySelectorAll<SVGGElement>('g.node[id]').forEach((element) => {
    const nodeId = NODE_ID.exec(element.id)?.[1]
    // [*] start and end markers of a state diagram are not items.
    if (nodeId && !/^root_(?:start|end)/.test(nodeId)) found.push({ nodeId, element, focusable: true })
  })
  root.querySelectorAll<SVGRectElement>('rect.actor[name]').forEach((rect) => {
    const element = rect.parentElement
    const nodeId = rect.getAttribute('name')
    if (nodeId && element instanceof SVGGElement) {
      found.push({ nodeId, element, focusable: rect.classList.contains('actor-top') })
    }
  })
  return found
}

/**
 * Finds the nodes of one rendered diagram inside `root` (this viewport's own container: the SVG is in the DOM twice
 * while the fullscreen dialog is open, so never look nodes up with document.getElementById) and makes each one that
 * has a glossary entry focusable. Returns the resolved items; dev warnings name the diagram and node id.
 */
export const resolveDiagramItems = (
  root: Element,
  items: Record<string, GlossaryKey>,
  titleOf: (key: GlossaryKey) => string,
  diagramLabel: string,
): ResolvedItem[] => {
  const resolved: ResolvedItem[] = []
  const seen = new Set<string>()
  for (const node of findNodes(root)) {
    const key = items[node.nodeId]
    if (!key) {
      if (import.meta.env.DEV) console.warn(`[architecture] ${diagramLabel}: node "${node.nodeId}" has no glossary entry`)
      continue
    }
    seen.add(node.nodeId)
    const { element } = node
    element.setAttribute(ITEM_ATTRIBUTE, key)
    element.setAttribute('role', 'button')
    element.setAttribute('aria-label', titleOf(key))
    element.setAttribute('aria-haspopup', 'dialog')
    element.setAttribute('tabindex', node.focusable ? '0' : '-1')
    resolved.push({ ...node, key })
  }
  if (import.meta.env.DEV) {
    for (const nodeId of Object.keys(items)) {
      if (!seen.has(nodeId)) console.warn(`[architecture] ${diagramLabel}: glossary entry "${nodeId}" has no node in the diagram`)
    }
  }
  return resolved
}
