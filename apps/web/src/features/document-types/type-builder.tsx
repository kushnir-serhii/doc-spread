import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import type { DocumentTemplate } from '@/lib/mock/templates'
import { FieldList } from './field-list'
import { blankDraft, draftFromTemplate, type TypeDraft } from './type-draft'

interface TypeBuilderProps {
  /** Mount with a `key` per template: the draft is created once from it. */
  template?: DocumentTemplate
}

export const TypeBuilder = ({ template }: TypeBuilderProps) => {
  const [draft] = useState<TypeDraft>(() => (template ? draftFromTemplate(template) : blankDraft()))

  return (
    <>
      <Link
        to="/types"
        className="mb-4 -ml-2 inline-flex min-h-touch items-center gap-1 rounded-md px-2 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to types
      </Link>
      <PageHeader title={draft.name || 'Untitled type'} description={draft.description || 'No description yet.'} />
      <h2 className="mb-2 text-sm font-medium">Fields ({draft.fields.length})</h2>
      <FieldList fields={draft.fields} />
    </>
  )
}
