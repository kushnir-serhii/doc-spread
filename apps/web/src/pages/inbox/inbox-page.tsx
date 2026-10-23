import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useDocuments, useDocumentTypes } from '@/lib/api'
import { PageHeader } from '@/components/layout/page-header'
import { allColumns, typeColumns } from '@/features/documents/document-columns'
import { UnclassifiedView } from '@/features/documents/unclassified-view'
import { DocumentTable } from '@/features/documents/document-table'
import { DocumentTableEmpty } from '@/features/documents/document-table-empty'
import { DocumentTableNoResults } from '@/features/documents/document-table-no-results'
import { DocumentTableError } from '@/features/documents/document-table-error'
import { DocumentTableSkeleton } from '@/features/documents/document-table-skeleton'
import { InboxFilters } from '@/features/documents/inbox-filters'
import { TypeSwitcher } from '@/features/documents/type-switcher'
import { buildListParams, effectiveFilters, parseStatus, resolveView } from '@/features/documents/inbox-view'
import type { InboxView } from '@/features/documents/inbox-view'
import { useTypeCounts } from '@/features/documents/use-type-counts'
import type { DocumentStatus, DocumentType } from '@/lib/mock/types'

const columnsFor = (view: InboxView, types: DocumentType[]) => {
  switch (view.kind) {
    case 'all':
      return allColumns(types)
    case 'unclassified':
      return []
    case 'type':
      return typeColumns(view.type)
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}

const InboxPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const typesQuery = useDocumentTypes()
  const types = typesQuery.data ?? []
  const view = resolveView(searchParams.get('type'), types)
  const filters = effectiveFilters(view, {
    status: parseStatus(searchParams.get('status')),
    search: searchParams.get('q') ?? '',
  })
  const listParams = buildListParams(view, filters)
  // keep the rows while filters change, but not across types: their columns differ
  const documentsQuery = useDocuments(listParams, {
    keepPreviousIf: (previous) => previous.typeId === listParams.typeId,
  })
  const counts = useTypeCounts()
  const documents = documentsQuery.data ?? []
  const isError = documentsQuery.isError || typesQuery.isError
  const isPending = documentsQuery.isPending || typesQuery.isPending

  const retry = () => {
    void documentsQuery.refetch()
    void typesQuery.refetch()
  }
  const setParam = useCallback(
    (key: string, value: string | undefined) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  const commitSearch = useCallback((value: string) => setParam('q', value.trim()), [setParam])
  const changeStatus = (status: DocumentStatus | undefined) => setParam('status', status)
  const clearFilters = () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('status')
        next.delete('q')
        return next
      },
      { replace: true },
    )
  const hasFilters = Boolean(filters.status || filters.search)
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
      {!isError && (
        <InboxFilters
          search={searchParams.get('q') ?? ''}
          status={filters.status}
          showStatus={view.kind !== 'unclassified'}
          resultCount={documentsQuery.data?.length}
          isUpdating={documentsQuery.isPlaceholderData}
          onSearchCommit={commitSearch}
          onStatusChange={changeStatus}
        />
      )}
      {isError ? (
        <DocumentTableError onRetry={retry} />
      ) : isPending ? (
        <DocumentTableSkeleton />
      ) : documents.length === 0 && hasFilters ? (
        <DocumentTableNoResults onClear={clearFilters} />
      ) : view.kind === 'unclassified' ? (
        <UnclassifiedView documents={documents} types={types} />
      ) : documents.length === 0 ? (
        <DocumentTableEmpty typeId={view.kind === 'type' ? view.type.id : undefined} />
      ) : (
        <DocumentTable documents={documents} columns={columnsFor(view, types)} />
      )}
    </>
  )
}

export default InboxPage
