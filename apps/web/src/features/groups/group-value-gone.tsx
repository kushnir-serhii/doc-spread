import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

interface GroupValueGoneProps {
  value: string
  valuesHref: string
}

export const GroupValueGone = ({ value, valuesHref }: GroupValueGoneProps) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-6 text-center sm:p-10">
    <div className="min-w-0">
      <h1 className="wrap-break-word text-lg font-semibold">No documents for ‘{value}’ any more</h1>
      <p className="mt-1 text-sm text-muted-foreground">They may have been rejected or changed.</p>
    </div>
    <Button asChild variant="outline" className="min-h-touch md:min-h-9">
      <Link to={valuesHref}>Back to values</Link>
    </Button>
  </div>
)
