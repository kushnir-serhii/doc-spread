import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import {
  createDocumentType as mockCreateDocumentType,
  createDocumentTypes as mockCreateDocumentTypes,
  getDocumentType as mockGetDocumentType,
  listDocumentTypes as mockListDocumentTypes,
  listTemplates,
  updateDocumentType as mockUpdateDocumentType,
} from '@/lib/mock'
import type { DocumentTemplate } from '@/lib/mock'
import {
  createDocumentType as realCreateDocumentType,
  createDocumentTypes as realCreateDocumentTypes,
  getDocumentType as realGetDocumentType,
  listDocumentTypes as realListDocumentTypes,
  updateDocumentType as realUpdateDocumentType,
} from '@/lib/real/document-types'
import { groupKeys } from './groups'
import { planKeys } from './plan'
import type { CreateDocumentTypeInput, UpdateDocumentTypeInput } from '@/lib/mock/types'

export const documentTypeKeys = {
  all: ['document-types'] as const,
  lists: () => [...documentTypeKeys.all, 'list'] as const,
  list: () => [...documentTypeKeys.lists()] as const,
  details: () => [...documentTypeKeys.all, 'detail'] as const,
  /** no version = the current one; pinned versions never change */
  detail: (id: string, version?: number) =>
    [...documentTypeKeys.details(), id, version ?? 'current'] as const,
}

export const templateKeys = {
  all: ['templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
}

export const useDocumentTypes = () =>
  useQuery({
    queryKey: documentTypeKeys.list(),
    queryFn: USE_MOCKS ? mockListDocumentTypes : realListDocumentTypes,
  })

/** null id (e.g. an unclassified document) skips the request */
export const useDocumentType = (id: string | null, version?: number) =>
  useQuery({
    queryKey: documentTypeKeys.detail(id ?? '', version),
    queryFn: id === null ? skipToken : () => (USE_MOCKS ? mockGetDocumentType(id, version) : realGetDocumentType(id, version)),
  })

export const useCreateDocumentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDocumentTypeInput) => (USE_MOCKS ? mockCreateDocumentType : realCreateDocumentType)(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentTypeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
      ]),
  })
}

/** Several types in one request, all or nothing (onboarding). */
export const useCreateDocumentTypes = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inputs: CreateDocumentTypeInput[]) => (USE_MOCKS ? mockCreateDocumentTypes : realCreateDocumentTypes)(inputs),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentTypeKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
        queryClient.invalidateQueries({ queryKey: planKeys.all }),
      ]),
  })
}

export const useUpdateDocumentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDocumentTypeInput }) =>
      (USE_MOCKS ? mockUpdateDocumentType : realUpdateDocumentType)(id, patch),
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentTypeKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: documentTypeKeys.detail(id),
          exact: true,
        }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      ]),
  })
}

/** Templates have no backend yet: with mocks off the list is empty. */
const noTemplates = async (): Promise<DocumentTemplate[]> => []

export const useTemplates = () =>
  useQuery({
    queryKey: templateKeys.list(),
    queryFn: USE_MOCKS ? listTemplates : noTemplates,
  })
