import { Link } from 'react-router'

interface NotAvailableYetProps {
  title: string
  description: string
  backTo: string
  backLabel: string
}

/** Shown instead of a screen or action that has no backend yet (mocks off). Text, not colour, carries the message. */
export const NotAvailableYet = ({ title, description, backTo, backLabel }: NotAvailableYetProps) => (
  <div role="status" className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
    <p className="font-medium">{title}</p>
    <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    <Link to={backTo} className="inline-flex min-h-touch items-center text-sm underline md:min-h-9">
      {backLabel}
    </Link>
  </div>
)
