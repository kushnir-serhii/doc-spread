import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useTemplates } from '@/lib/api'
import { TemplateCard } from './template-card'
import { TypesError } from './types-error'

const GRID = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'

export const TemplateGallery = () => {
  const { data, isPending, isError, refetch } = useTemplates()

  return (
    <>
      <PageHeader
        title="Choose a template"
        description="Pick a starting point. Nothing is saved until you save the type."
        actions={
          <Link
            to="/types/new"
            className="inline-flex min-h-touch items-center rounded-md border px-4 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
          >
            Start blank
          </Link>
        }
      />
      {isError ? (
        <TypesError title="Couldn't load templates" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div role="status" aria-label="Loading templates" className={GRID}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No templates available. Start blank instead.
        </p>
      ) : (
        <ul className={GRID}>
          {data.map((template) => (
            <li key={template.id}>
              <TemplateCard template={template} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
