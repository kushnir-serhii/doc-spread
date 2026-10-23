import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export const DocumentTableEmpty = () => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
    <div>
      <h2 className="text-lg font-semibold">No documents yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a document, or define a document type so the AI knows what to extract.
      </p>
    </div>
    <div className="flex flex-wrap justify-center gap-2">
      <Button asChild className="min-h-touch">
        <Link to="/upload">Upload documents</Link>
      </Button>
      <Button asChild variant="outline" className="min-h-touch">
        <Link to="/types">Manage document types</Link>
      </Button>
    </div>
  </div>
)
