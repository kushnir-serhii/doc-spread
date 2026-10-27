import { FileText, ScanSearch, UploadCloud } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'

type Step = {
  title: string
  description: string
  icon: LucideIcon
}

const STEPS: Step[] = [
  {
    title: 'Describe your document',
    description:
      'Start from a template, build from scratch, or show a sample and point at the values.',
    icon: FileText,
  },
  {
    title: 'Upload your files',
    description: 'Each one is sorted into its type automatically.',
    icon: UploadCloud,
  },
  {
    title: 'Review and export',
    description:
      'Check the values side by side with the document, approve, and export CSV or XLSX.',
    icon: ScanSearch,
  },
]

export const HowItWorks = () => {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:px-8 md:py-16"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight md:text-3xl">
        How it works
      </h2>
      <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-6 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-muted-foreground">Step {index + 1}</span>
            </div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-base text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
