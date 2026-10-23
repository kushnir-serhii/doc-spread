import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useTemplates } from '@/lib/api'
import { TypeBuilder } from './type-builder'
import { TypesError } from './types-error'

interface TemplateBuilderProps {
  templateId: string
}

/** Loads one template, then mounts the builder with a draft copied from it. */
export const TemplateBuilder = ({ templateId }: TemplateBuilderProps) => {
  const { data, isPending, isError, refetch } = useTemplates()

  if (isError) return <TypesError title="Couldn't load the template" onRetry={() => void refetch()} />
  if (isPending) return <Skeleton role="status" aria-label="Loading template" className="h-64 w-full rounded-lg" />

  const template = data.find((t) => t.id === templateId)
  if (!template) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 rounded-lg border p-8 text-center">
        <p className="font-medium">Template not found</p>
        <Link to="/types/new?from=template" className="inline-flex min-h-touch items-center text-sm underline md:min-h-9">
          Back to templates
        </Link>
      </div>
    )
  }
  return <TypeBuilder key={template.id} template={template} />
}
