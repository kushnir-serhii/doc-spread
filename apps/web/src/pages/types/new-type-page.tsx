import { Construction } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { TemplateBuilder } from '@/features/document-types/template-builder'
import { TemplateGallery } from '@/features/document-types/template-gallery'
import { TypeBuilder } from '@/features/document-types/type-builder'

const NewTypePage = () => {
  const [params] = useSearchParams()
  const templateId = params.get('template')

  if (params.get('from') === 'template') return <TemplateGallery />
  if (templateId) return <TemplateBuilder templateId={templateId} />
  if (params.get('from') === 'sample') {
    return (
      <>
        <PageHeader title="From a sample" description="Upload a document and AI suggests fields." />
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card p-8 text-center">
          <Construction className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">Coming with spec 015.</p>
          <Link to="/types/new" className="inline-flex min-h-touch items-center text-sm underline md:min-h-9">
            Start blank instead
          </Link>
        </div>
      </>
    )
  }
  return <TypeBuilder />
}

export default NewTypePage
