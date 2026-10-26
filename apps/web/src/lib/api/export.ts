import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExportJob, getExportMapping, listExportJobs } from '@/lib/mock'
import type { CreateExportJobInput } from '@/lib/mock/types'
import { documentKeys } from './documents'
import { groupKeys } from './groups'

export const exportKeys = {
  all: ['export'] as const,
  lists: () => [...exportKeys.all, 'list'] as const,
  list: () => [...exportKeys.lists()] as const,
  mappings: () => [...exportKeys.all, 'mapping'] as const,
  mapping: (typeId: string) => [...exportKeys.mappings(), typeId] as const,
}

export const useExportMapping = (typeId: string) =>
  useQuery({
    queryKey: exportKeys.mapping(typeId),
    queryFn: () => getExportMapping(typeId),
  })

export const useExportJobs = () =>
  useQuery({
    queryKey: exportKeys.list(),
    queryFn: listExportJobs,
  })

/** exporting changes document status, so documents and group values go stale too */
export const useCreateExportJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExportJobInput) => createExportJob(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: exportKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: exportKeys.mappings() }),
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: documentKeys.details() }),
        queryClient.invalidateQueries({ queryKey: groupKeys.all }),
      ]),
  })
}
