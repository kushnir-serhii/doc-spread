import { Calculator } from 'lucide-react'

/** Marks a computed column in a header or a label: a calculator icon, and "(computed)" for screen readers. */
export const ComputedMark = () => (
  <>
    <Calculator className="ml-1.5 inline size-3.5 align-text-bottom" aria-hidden="true" />
    <span className="sr-only"> (computed)</span>
  </>
)
