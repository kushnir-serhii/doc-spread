import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export const UnclassifiedEmpty = () => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
    <h2 className="text-lg font-semibold">Nothing to classify. Every document has a type.</h2>
    <Button asChild variant="outline" className="min-h-touch">
      <Link to="?">View all documents</Link>
    </Button>
  </div>
)
