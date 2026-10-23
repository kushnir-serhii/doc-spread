import { useDocuments, useDocumentTypes } from '@/lib/api'
import { PageHeader } from '@/components/layout/page-header'
import { DocumentTable } from '@/features/documents/document-table'
import { DocumentTableEmpty } from '@/features/documents/document-table-empty'
import { DocumentTableError } from '@/features/documents/document-table-error'
import { DocumentTableSkeleton } from '@/features/documents/document-table-skeleton'

const InboxPage = () => {
  const documentsQuery = useDocuments()
  const typesQuery = useDocumentTypes()
  const documents = documentsQuery.data ?? []
  const isError = documentsQuery.isError || typesQuery.isError
  const isPending = documentsQuery.isPending || typesQuery.isPending
  const retry = () => {
    void documentsQuery.refetch()
    void typesQuery.refetch()
  }
  return (
    <>
      <PageHeader title="Inbox" description="All documents, their status and AI confidence." />
      {isError ? (
        <DocumentTableError onRetry={retry} />
      ) : isPending ? (
        <DocumentTableSkeleton />
      ) : documents.length === 0 ? (
        <DocumentTableEmpty />
      ) : (
        <DocumentTable documents={documents} types={typesQuery.data ?? []} />
      )}
    </>
  )
}

export default InboxPage
