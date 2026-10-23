import { useState } from 'react'
import { nextRotation, type ViewRotation } from './rotation'

/** View-only rotation per page, kept above virtualization; tied to the document so it resets when that changes. */
export const usePageRotations = (documentId: string) => {
  const [state, setState] = useState<{ documentId: string; byPage: Record<number, ViewRotation> }>({
    documentId,
    byPage: {},
  })
  const rotations = state.documentId === documentId ? state.byPage : {}
  const rotationOf = (index: number): ViewRotation => rotations[index] ?? 0
  const rotatePages = (indexes: number[]) => {
    const byPage = { ...rotations }
    for (const i of indexes) byPage[i] = nextRotation(rotationOf(i))
    setState({ documentId, byPage })
  }
  return { rotationOf, rotatePages }
}
