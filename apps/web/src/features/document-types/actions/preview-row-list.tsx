interface PreviewRowListProps {
  /** one line per row, already formatted: "Row 3: …" */
  lines: readonly { key: string; text: string }[]
  /** rows beyond the lines shown */
  more: number
}

/** The first few rows of a row preview, and how many more there are. */
export const PreviewRowList = ({ lines, more }: PreviewRowListProps) => (
  <>
    {lines.length > 0 && (
      <ul className="flex flex-col gap-1">
        {lines.map((line) => (
          <li key={line.key}>{line.text}</li>
        ))}
      </ul>
    )}
    {more > 0 && <p className="mt-1 text-xs">…and {more} more.</p>}
  </>
)
