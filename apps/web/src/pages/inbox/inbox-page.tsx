import { useSearchParams } from 'react-router'
import { useDocuments, useDocumentTypes } from '@/lib/api'
import { PageHeader } from '@/components/layout/page-header'
import { allColumns, typeColumns, unclassifiedColumns } from '@/features/documents/document-columns'
import { DocumentTable } from '@/features/documents/document-table'
import { DocumentTableEmpty } from '@/features/documents/document-table-empty'
import { DocumentTableError } from '@/features/documents/document-table-error'
import { DocumentTableSkeleton } from '@/features/documents/document-table-skeleton'
import { TypeSwitcher } from '@/features/documents/type-switcher'
import { buildListParams, resolveView } from '@/features/documents/inbox-view'
import type { InboxView } from '@/features/documents/inbox-view'
import { useTypeCounts } from '@/features/documents/use-type-counts'
import type { DocumentType } from '@/lib/mock/types'

const columnsFor = (view: InboxView, types: DocumentType[]) => {
  switch (view.kind) {
    case 'all':
      return allColumns(types)
    case 'unclassified':
      return unclassifiedColumns()
    case 'type':
      return typeColumns(view.type)
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}

const InboxPage = () => {
  const [searchParams] = useSearchParams()
  const typesQuery = useDocumentTypes()
  const types = typesQuery.data ?? []
  const view = resolveView(searchParams.get('type'), types)
  const documentsQuery = useDocuments(buildListParams(view))
  const counts = useTypeCounts()
  const documents = documentsQuery.data ?? []
  const isError = documentsQuery.isError || typesQuery.isError
  const isPending = documentsQuery.isPending || typesQuery.isPending

  const retry = () => {
    void documentsQuery.refetch()
    void typesQuery.refetch()
  }
  const hrefFor = (type: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (type) next.set('type', type)
    else next.delete('type')
    const query = next.toString()
    return query ? `?${query}` : '?'
  }
  const active = view.kind === 'type' ? view.type.id : view.kind

  return (
    <>
      <PageHeader title="Inbox" description="All documents, their status and AI confidence." />
      {!isError && (
        <TypeSwitcher
          types={types}
          active={active}
          counts={typesQuery.isPending ? undefined : counts}
          hrefFor={hrefFor}
        />
      )}
      {isError ? (
        <DocumentTableError onRetry={retry} />
      ) : isPending ? (
        <DocumentTableSkeleton />
      ) : documents.length === 0 ? (
        <DocumentTableEmpty typeId={view.kind === 'type' ? view.type.id : undefined} />
      ) : (
        <DocumentTable documents={documents} columns={columnsFor(view, types)} />
      )}
    </>
  )
}

export default InboxPage
