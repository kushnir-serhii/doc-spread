import type { ReactNode } from 'react'

interface PreviewFrameProps {
  children: ReactNode
}

export const PreviewFrame = ({ children }: PreviewFrameProps) => (
  <section aria-labelledby="action-preview-heading" className="flex flex-col gap-2 rounded-lg border bg-card p-4">
    <h3 id="action-preview-heading" className="text-sm font-medium">
      Preview
    </h3>
    {children}
  </section>
)
