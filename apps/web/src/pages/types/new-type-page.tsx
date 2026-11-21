import { useSearchParams } from 'react-router'
import { NotAvailableYet } from '@/components/layout/not-available-yet'
import { SampleTypeBuilder } from '@/features/document-types/sample/sample-type-builder'
import { TemplateBuilder } from '@/features/document-types/template-builder'
import { TemplateGallery } from '@/features/document-types/template-gallery'
import { blankDraft } from '@/features/document-types/type-draft'
import { TypeBuilder } from '@/features/document-types/type-builder'
import { USE_MOCKS } from '@/lib/env'

const NewTypePage = () => {
  const [params] = useSearchParams()
  const templateId = params.get('template')
  const documentId = params.get('documentId')

  const needsAi = params.get('from') === 'template' || templateId || params.get('from') === 'sample' || documentId
  if (!USE_MOCKS && needsAi) {
    return (
      <NotAvailableYet
        title="Not available yet"
        description="Templates and creating a type from a sample are not available yet. Start with a blank type and add the fields yourself."
        backTo="/types/new"
        backLabel="Start blank"
      />
    )
  }
  if (params.get('from') === 'template') return <TemplateGallery />
  if (templateId) return <TemplateBuilder templateId={templateId} />
  if (params.get('from') === 'sample' || documentId) return <SampleTypeBuilder documentId={documentId} />
  return <TypeBuilder initialDraft={blankDraft()} />
}

export default NewTypePage
