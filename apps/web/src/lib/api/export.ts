import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import {
  createExportJob as mockCreateExportJob,
  getExportMapping as mockGetExportMapping,
  listExportJobs as mockListExportJobs,
} from '@/lib/mock'
import {
  createExportJob as realCreateExportJob,
  getExportMapping as realGetExportMapping,
  listExportJobs as realListExportJobs,
} from '@/lib/real/export'
import type { CreateExportJobInput, ExportDownload, ExportJob } from '@/lib/mock/types'
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
    queryFn: () => (USE_MOCKS ? mockGetExportMapping(typeId) : realGetExportMapping(typeId)),
  })

export const useExportJobs = () =>
  useQuery({
    queryKey: exportKeys.list(),
    queryFn: USE_MOCKS ? mockListExportJobs : realListExportJobs,
  })

/** `download` is set when the server built the file (mocks off); with mocks on the page builds the CSV itself. */
const createJob = async (input: CreateExportJobInput): Promise<{ job: ExportJob; download?: ExportDownload }> =>
  USE_MOCKS ? { job: await mockCreateExportJob(input) } : realCreateExportJob(input)

/** exporting changes document status, so documents and group values go stale too */
export const useCreateExportJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createJob,
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
