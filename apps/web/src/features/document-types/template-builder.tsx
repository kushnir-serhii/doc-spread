import { Skeleton } from '@/components/ui/skeleton'
import { useTemplates } from '@/lib/api'
import { draftFromTemplate } from './type-draft'
import { TypeBuilder } from './type-builder'
import { TypeNotFound } from './type-not-found'
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
    return <TypeNotFound title="Template not found" backTo="/types/new?from=template" backLabel="Back to templates" />
  }
  return <TypeBuilder key={template.id} initialDraft={draftFromTemplate(template)} />
}
