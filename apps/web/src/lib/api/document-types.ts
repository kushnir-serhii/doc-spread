import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDocumentType,
  getDocumentType,
  listDocumentTypes,
  listTemplates,
  updateDocumentType,
} from '@/lib/mock'
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
    queryFn: listDocumentTypes,
  })

/** null id (e.g. an unclassified document) skips the request */
export const useDocumentType = (id: string | null, version?: number) =>
  useQuery({
    queryKey: documentTypeKeys.detail(id ?? '', version),
    queryFn: id === null ? skipToken : () => getDocumentType(id, version),
  })

export const useCreateDocumentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDocumentTypeInput) => createDocumentType(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: documentTypeKeys.lists() }),
  })
}

export const useUpdateDocumentType = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDocumentTypeInput }) =>
      updateDocumentType(id, patch),
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentTypeKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: documentTypeKeys.detail(id),
          exact: true,
        }),
      ]),
  })
}

export const useTemplates = () =>
  useQuery({
    queryKey: templateKeys.list(),
    queryFn: listTemplates,
  })
