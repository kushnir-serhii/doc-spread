import { Layers } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export const GroupingsEmptyState = () => (
  <div className="flex flex-col items-center rounded-lg border border-dashed p-6 text-center sm:p-10">
    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Layers className="size-6" aria-hidden />
    </span>
    <h2 className="mt-4 text-lg font-semibold">No groups yet</h2>
    <p className="mt-1 max-w-md text-sm text-muted-foreground">
      To group documents by a field, like a supplier or a client, open a document type and turn on “Group
      documents by this field” for that field in the type builder.
    </p>
    <Button asChild variant="outline" className="mt-6 min-h-touch md:min-h-9">
      <Link to="/types">Go to document types</Link>
    </Button>
  </div>
)
