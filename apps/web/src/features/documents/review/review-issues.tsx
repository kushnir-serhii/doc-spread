import type { ValidationIssue } from '@/lib/fields/validate-field-value'

interface ReviewIssuesProps {
  issues: ValidationIssue[]
  onSelect: (issue: ValidationIssue) => void
}

/** Why Approve is blocked: each problem is a button that moves focus to its field. */
export const ReviewIssues = ({ issues, onSelect }: ReviewIssuesProps) => (
  <div role="alert" className="max-h-32 overflow-y-auto rounded-md border border-destructive/40 p-3 text-sm">
    <p className="font-medium text-destructive">
      Can’t approve yet. Fix {issues.length === 1 ? 'this problem' : `these ${issues.length} problems`}:
    </p>
    <ul className="mt-1 flex flex-col">
      {issues.map((issue) => (
        <li key={`${issue.fieldId}:${issue.cell?.rowId ?? ''}:${issue.cell?.columnId ?? ''}`}>
          <button
            type="button"
            className="min-h-touch w-full rounded-sm text-left underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
            onClick={() => onSelect(issue)}
          >
            <span className="font-medium">{issue.label}</span>: <span className="break-words">{issue.reason}</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
)
