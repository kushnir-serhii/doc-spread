import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export const GroupValuesEmpty = () => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-6 text-center sm:p-10">
    <div>
      <h2 className="text-lg font-semibold">No values yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Values appear here once documents of this type have been uploaded.
      </p>
    </div>
    <Button asChild className="min-h-touch md:min-h-9">
      <Link to="/upload">Upload documents</Link>
    </Button>
  </div>
)
