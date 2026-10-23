import type { Ref } from 'react'
import { plural } from './field-key'
import type { ValidationIssue } from './validate-draft'

interface ErrorSummaryProps {
  issues: ValidationIssue[]
  ref?: Ref<HTMLDivElement>
  onSelect: (issue: ValidationIssue) => void
}

/** Lists what blocks saving; each line takes you to the input. Focused after a failed Save. */
export const ErrorSummary = ({ issues, ref, onSelect }: ErrorSummaryProps) => (
  <div
    ref={ref}
    role="alert"
    tabIndex={-1}
    className="mb-6 rounded-lg border border-destructive bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <h2 className="text-sm font-semibold text-destructive">
      {plural(issues.length, 'problem')} to fix before saving
    </h2>
    <ul className="mt-2 flex flex-col">
      {issues.map((issue) => (
        <li key={issue.id}>
          <button
            type="button"
            onClick={() => onSelect(issue)}
            className="min-h-touch w-full rounded-md px-1 text-left text-sm underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
          >
            <span className="font-medium">{issue.subject}:</span> {issue.message}
          </button>
        </li>
      ))}
    </ul>
  </div>
)
