import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import {
  approveDocuments,
  getDocument,
  getDocumentPages,
  listDocuments,
  reassignDocumentType,
  rejectDocument,
  updateDocumentValues,
  uploadDocument,
} from '@/lib/mock'
import type { Document, FieldValue, ListDocumentsParams } from '@/lib/mock/types'
import { groupKeys } from './groups'

const POLL_INTERVAL_MS = 1500

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

export const useDocuments = (params: ListDocumentsParams = {}) =>
  useQuery({
    queryKey: documentKeys.list(params),
    queryFn: () => listDocuments(params),
    refetchInterval: pollWhilePending,
  })

export const useDocument = (id: string) =>
  useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => getDocument(id),
    refetchInterval: pollWhilePending,
  })

/** null id skips the request */
export const useDocumentPages = (id: string | null) =>
  useQuery({
    queryKey: documentKeys.pages(id ?? ''),
    queryFn: id === null ? skipToken : () => getDocumentPages(id),
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
      updateDocumentValues(id, patch),
    onSuccess: (_data, { id }) => invalidateAfterChange(queryClient, [id]),
  })
}

export const useApproveDocuments = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => approveDocuments(ids),
    onSuccess: (_data, ids) => invalidateAfterChange(queryClient, ids),
  })
}

export const useRejectDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectDocument(id, reason),
    onSuccess: (_data, { id }) => invalidateAfterChange(queryClient, [id]),
  })
}

export const useReassignDocumentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, typeId }: { id: string; typeId: string }) =>
      reassignDocumentType(id, typeId),
    onSuccess: (_data, { id }) => invalidateAfterChange(queryClient, [id]),
  })
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() }),
  })
}
