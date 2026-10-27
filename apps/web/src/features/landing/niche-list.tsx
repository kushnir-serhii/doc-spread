const NICHES = [
  'Invoices',
  'Receipts',
  'Contracts',
  'HR forms',
  'Delivery notes',
  'Your own type',
] as const

export const NicheList = () => {
  return (
    <ul aria-label="Works with" className="flex flex-wrap gap-2">
      {NICHES.map((niche) => (
        <li
          key={niche}
          className="rounded-full border bg-muted px-3 py-1 text-sm text-muted-foreground"
        >
          {niche}
        </li>
      ))}
    </ul>
  )
}
