import { useSearchParams } from 'react-router'
import { SampleTypeBuilder } from '@/features/document-types/sample/sample-type-builder'
import { TemplateBuilder } from '@/features/document-types/template-builder'
import { TemplateGallery } from '@/features/document-types/template-gallery'
import { blankDraft } from '@/features/document-types/type-draft'
import { TypeBuilder } from '@/features/document-types/type-builder'

const NewTypePage = () => {
  const [params] = useSearchParams()
  const templateId = params.get('template')
  const documentId = params.get('documentId')

  if (params.get('from') === 'template') return <TemplateGallery />
  if (templateId) return <TemplateBuilder templateId={templateId} />
  if (params.get('from') === 'sample' || documentId) return <SampleTypeBuilder documentId={documentId} />
  return <TypeBuilder initialDraft={blankDraft()} />
}

export default NewTypePage
