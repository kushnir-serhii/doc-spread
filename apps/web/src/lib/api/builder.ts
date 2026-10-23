import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFieldExample, proposeFields, testExtract } from '@/lib/mock'
import type { FieldExample, TestExtractInput } from '@/lib/mock/types'
import { documentTypeKeys } from './document-types'

export const builderKeys = {
  all: ['builder'] as const,
  proposals: (documentId: string) =>
    [...builderKeys.all, 'proposals', documentId] as const,
}

/** proposals for one document never change, so they are fetched once */
export const useProposeFields = (documentId: string) =>
  useQuery({
    queryKey: builderKeys.proposals(documentId),
    queryFn: () => proposeFields(documentId),
    staleTime: Infinity,
  })

/** saves nothing, so there is nothing to invalidate */
export const useTestExtract = () =>
  useMutation({
    mutationFn: (input: TestExtractInput) => testExtract(input),
  })

export const useAddFieldExample = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      typeId,
      fieldId,
      example,
    }: {
      typeId: string
      fieldId: string
      example: FieldExample
    }) => addFieldExample(typeId, fieldId, example),
    onSuccess: (_data, { typeId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: documentTypeKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: documentTypeKeys.detail(typeId),
          exact: true,
        }),
      ]),
  })
}
