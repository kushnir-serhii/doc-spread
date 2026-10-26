import type { ValidationIssue } from '@/lib/fields/validate-field-value'
import { cn } from '@/lib/utils'

interface ReviewIssuesProps {
  issues: ValidationIssue[]
  onSelect: (issue: ValidationIssue) => void
  /** `blocking`: Approve can't go on until these are fixed. `warning`: for information, Approve asks to confirm. */
  tone?: 'blocking' | 'warning'
  /** the heading; defaults to the blocking text */
  title?: string
  /** `alert` when it appears after an action; `status` for a list that follows the draft while typing */
  role?: 'alert' | 'status'
}

/** A list of problems: each is a button that moves focus to its field. */
export const ReviewIssues = ({ issues, onSelect, tone = 'blocking', title, role = 'alert' }: ReviewIssuesProps) => (
  <div
    role={role}
    className={cn(
      'max-h-32 overflow-y-auto rounded-md border p-3 text-sm',
      tone === 'blocking' ? 'border-destructive/40' : 'border-warning bg-warning-soft text-warning-soft-foreground',
    )}
  >
    <p className={cn('font-medium', tone === 'blocking' && 'text-destructive')}>
      {title ?? `Can’t approve yet. Fix ${issues.length === 1 ? 'this problem' : `these ${issues.length} problems`}:`}
    </p>
    <ul className="mt-1 flex flex-col">
      {issues.map((issue) => (
        <li key={`${issue.fieldId}:${issue.cell?.rowId ?? ''}:${issue.cell?.columnId ?? ''}:${issue.label}`}>
          <button
            type="button"
            className="min-h-touch w-full rounded-sm text-left underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0"
            onClick={() => onSelect(issue)}
          >
            <span className="font-medium">{issue.label}</span>: <span className="break-words tabular-nums">{issue.reason}</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
)
