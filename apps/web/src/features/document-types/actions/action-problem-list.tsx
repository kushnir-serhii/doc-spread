interface ActionProblemListProps {
  problems: string[]
  /** a slot is still empty */
  incomplete: boolean
}

/** What stops the action from being saved; announced as it changes. An empty slot is a soft hint, not an error. */
export const ActionProblemList = ({ problems, incomplete }: ActionProblemListProps) => (
  <div aria-live="polite" className="flex flex-col gap-1 text-sm">
    {problems.length > 0 && (
      <ul className="flex flex-col gap-1 text-destructive">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    )}
    {incomplete && <p className="text-muted-foreground">Fill in every part of the expression to save.</p>}
  </div>
)
