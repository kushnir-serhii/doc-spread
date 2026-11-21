import { skipToken, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import {
  approveDocuments as mockApproveDocuments,
  getDocument as mockGetDocument,
  getDocumentPages as mockGetDocumentPages,
  listDocuments as mockListDocuments,
  reassignDocumentType as mockReassignDocumentType,
  rejectDocument as mockRejectDocument,
  updateDocumentValues as mockUpdateDocumentValues,
  uploadDocument as mockUploadDocument,
} from '@/lib/mock'
import {
  approveDocuments as realApproveDocuments,
  getDocument as realGetDocument,
  listDocuments as realListDocuments,
  rejectDocument as realRejectDocument,
  updateDocumentValues as realUpdateDocumentValues,
} from '@/lib/real/documents'
import { getDocumentPages as realGetDocumentPages } from '@/lib/real/pages'
import { notAvailableYet } from '@/lib/real/not-available'
import { uploadDocument as realUploadDocument } from '@/lib/real/upload'
import { planKeys } from './plan'
import type { Document, FieldValue, ListDocumentsParams } from '@/lib/mock/types'
import { groupKeys } from './groups'

const POLL_INTERVAL_MS = USE_MOCKS ? 1500 : 3000

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params: ListDocumentsParams = {}) =>
    [...documentKeys.lists(), params] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  /** separate branch so invalidating details() never refetches pages */
  pages: (id: string) => [...documentKeys.all, 'pages', id] as const,
}

/** true while a document is still moving through the processing pipeline */
const isPendingPipeline = (data: Document | Document[] | undefined) =>
  [data ?? []].flat().some((d) => d.status === 'uploaded' || d.status === 'processing')

const pollWhilePending = (query: { state: { data: Document | Document[] | undefined } }) =>
  isPendingPipeline(query.state.data) ? POLL_INTERVAL_MS : false

interface UseDocumentsOptions {
  /** keep showing the previous list (isPlaceholderData) while new params load, when this returns true for its params */
  keepPreviousIf?: (previous: ListDocumentsParams) => boolean
}

export const useDocuments = (params: ListDocumentsParams = {}, { keepPreviousIf }: UseDocumentsOptions = {}) =>
  useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => (USE_MOCKS ? mockListDocuments(params) : realListDocuments(params)),
    refetchInterval: pollWhilePending,
    placeholderData: (previous, previousQuery) =>
      keepPreviousIf && previousQuery && keepPreviousIf(previousQuery.queryKey[2]) ? previous : undefined,
  })

export const useDocument = (id: string) =>
  useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => (USE_MOCKS ? mockGetDocument(id) : realGetDocument(id)),
    refetchInterval: pollWhilePending,
  })

/** several details at once (same keys and polling as useDocument), results in the order of `ids` */
export const useDocumentsByIds = (ids: string[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: documentKeys.detail(id),
      queryFn: () => (USE_MOCKS ? mockGetDocument(id) : realGetDocument(id)),
      refetchInterval: pollWhilePending,
    })),
  })

/** Seeded documents with real OCR words: ready-made samples for a try-out (mock data; the backend lists its own). */
const DEMO_DOCUMENT_IDS = USE_MOCKS ? ['doc-001', 'doc-002'] : []

export const useDemoDocuments = () => useDocumentsByIds(DEMO_DOCUMENT_IDS)

/** null id skips the request */
export const useDocumentPages = (id: string | null) =>
  useQuery({
    queryKey: documentKeys.pages(id ?? ''),
    queryFn:
      id === null
        ? skipToken
        : () => (USE_MOCKS ? mockGetDocumentPages(id) : realGetDocumentPages(id)),
    staleTime: Infinity,
  })

/** every document mutation changes lists and group values; details are per call */
const invalidateAfterChange = (queryClient: QueryClient, ids: string[]) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: documentKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: groupKeys.all }),
    ...ids.map((id) =>
      queryClient.invalidateQueries({
        queryKey: documentKeys.detail(id),
        exact: true,
      }),
    ),
  ])

export const useUpdateDocumentValues = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, FieldValue> }) =>
      USE_MOCKS ? mockUpdateDocumentValues(id, patch) : realUpdateDocumentValues(id, patch),
    onSuccess: (_data, { id }) => invalidateAfterChange(queryClient, [id]),
  })
}

export const useApproveDocuments = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      USE_MOCKS ? mockApproveDocuments(ids) : realApproveDocuments(ids),
    onSuccess: (_data, ids) => invalidateAfterChange(queryClient, ids),
  })
}

export const useRejectDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      USE_MOCKS ? mockRejectDocument(id, reason) : realRejectDocument(id, reason),
    onSuccess: (_data, { id }) => invalidateAfterChange(queryClient, [id]),
  })
}

export const useReassignDocumentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, typeId }: { id: string; typeId: string }) =>
      USE_MOCKS ? mockReassignDocumentType(id, typeId) : Promise.reject(notAvailableYet('Changing the type')),
    onSuccess: (_data, { id }) => invalidateAfterChange(queryClient, [id]),
  })
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      file,
      typeId,
      onProgress,
    }: {
      file: File
      typeId?: string
      onProgress?: (fraction: number) => void
    }) => (USE_MOCKS ? mockUploadDocument : realUploadDocument)(file, { typeId, onProgress }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
      ]),
  })
}
