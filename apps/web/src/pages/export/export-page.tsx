import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { ExportEmpty } from '@/features/export/export-empty'
import { ExportError } from '@/features/export/export-error'
import { ExportForm } from '@/features/export/export-form'
import { ExportHistory } from '@/features/export/export-history'
import { panelId, tabId } from '@/features/export/export-tab-ids'
import { ExportTabs } from '@/features/export/export-tabs'
import type { ExportTab } from '@/features/export/export-tab-ids'
import type { ExportResult } from '@/features/export/export-result'
import { ExportSkeleton } from '@/features/export/export-skeleton'
import { ExportSuccess } from '@/features/export/export-success'
import { ExportTypeSelect } from '@/features/export/export-type-select'
import { useDocuments, useDocumentTypes } from '@/lib/api'

const ExportPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  // lives here: exported documents leave the approved list, which unmounts the form
  const [result, setResult] = useState<ExportResult>()
  const typeParam = searchParams.get('type')
  const typesQuery = useDocumentTypes()
  const approvedQuery = useDocuments({ status: 'approved' })
  const types = typesQuery.data ?? []
  const approved = approvedQuery.data ?? []

  const approvedCounts = approvedQuery.data
    ? approved.reduce((counts, doc) => {
        if (doc.typeId) counts.set(doc.typeId, (counts.get(doc.typeId) ?? 0) + 1)
        return counts
      }, new Map<string, number>())
    : undefined

  // changing the type drops ?ids=: they belonged to the previous one
  const changeType = (typeId: string) => {
    setResult(undefined)
    setSearchParams({ type: typeId }, { replace: true })
  }
  // switching tabs keeps ?type= (and the rest)
  const tab: ExportTab = searchParams.get('tab') === 'history' ? 'history' : 'new'
  const changeTab = (next: ExportTab) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'history') params.set('tab', 'history')
      else params.delete('tab')
      return params
    })
  const viewHistory = () => changeTab('history')
  const retry = () => {
    void typesQuery.refetch()
    void approvedQuery.refetch()
  }

  const type = types.find((candidate) => candidate.id === typeParam)
  const documents = type ? approved.filter((doc) => doc.typeId === type.id) : []

  const body = () => {
    if (typesQuery.isError || approvedQuery.isError) return <ExportError onRetry={retry} />
    if (typesQuery.isPending || approvedQuery.isPending) return <ExportSkeleton />
    if (types.length === 0) return <ExportEmpty empty={{ kind: 'no-types' }} />
    return (
      <div className="flex flex-col gap-6">
        <ExportTypeSelect types={types} value={typeParam} approvedCounts={approvedCounts} onChange={changeType} />
        {!typeParam ? null : !type ? (
          <ExportEmpty empty={{ kind: 'unknown-type' }} />
        ) : result && result.typeId === type.id ? (
          <ExportSuccess result={result} onExportMore={() => setResult(undefined)} onViewHistory={viewHistory} />
        ) : documents.length === 0 ? (
          <ExportEmpty empty={{ kind: 'nothing-approved', typeId: type.id, typeName: type.name }} />
        ) : (
          <ExportForm key={type.id} type={type} documents={documents} idsParam={searchParams.get('ids')}
            onExported={setResult}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Export" description="Turn approved documents of one type into a spreadsheet or a PDF bundle." />
      <div className="flex flex-col gap-6">
        <ExportTabs value={tab} onChange={changeTab} />
        <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
          {tab === 'history' ? <ExportHistory onNewExport={() => changeTab('new')} /> : body()}
        </div>
      </div>
    </>
  )
}

export default ExportPage
