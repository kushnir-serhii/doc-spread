import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/** Placeholder until slice 2 (template cards). */
export const TypesStep = () => (
  <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">Templates are coming in the next step.</p>
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="outline" className="min-h-touch md:min-h-9">
        <Link to="/onboarding?step=company">Back</Link>
      </Button>
      <Button asChild className="min-h-touch md:min-h-9">
        <Link to="/inbox">Continue to app</Link>
      </Button>
    </div>
  </div>
)
