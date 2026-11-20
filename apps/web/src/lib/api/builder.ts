import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { USE_MOCKS } from '@/lib/env'
import { notAvailableYet } from '@/lib/real/not-available'
import { addFieldExample, proposeFields, suggestField, suggestTable, testExtract } from '@/lib/mock'
import type { FieldAction, FieldDef, FieldExample, SuggestFieldInput, SuggestTableInput, TestExtractInput } from '@/lib/mock/types'
import { getAllComputedColumnIds, getComputedFieldIds } from '@/lib/fields/computed-fields'
import { documentTypeKeys } from './document-types'

export const builderKeys = {
  all: ['builder'] as const,
  proposals: (documentId: string) =>
    [...builderKeys.all, 'proposals', documentId] as const,
  /** what the AI reads of a field: renaming a label doesn't change the extraction */
  preview: (documentId: string, fields: FieldDef[], actions: FieldAction[] = []) =>
    [
      ...builderKeys.all,
      'preview',
      documentId,
      fields.map(({ id, type, hint, options, examples }) => [
        id,
        type,
        hint,
        options,
        examples.map((e) => [e.documentId, e.page, e.bbox, e.text]),
      ]),
      // computed fields are not extracted
      [...getComputedFieldIds({ actions })],
      [...getAllComputedColumnIds({ actions })],
    ] as const,
}

/** The AI builder has no backend yet: with mocks off its calls fail with "not available yet" (the screens that use them are disabled). */
const AI_BUILDER = 'The AI type builder'
const requireAiBuilder = (): void => {
  if (!USE_MOCKS) throw notAvailableYet(AI_BUILDER)
}

/** proposals for one document never change, so they are fetched once */
export const useProposeFields = (documentId: string) =>
  useQuery({
    queryKey: builderKeys.proposals(documentId),
    queryFn: () => {
      requireAiBuilder()
      return proposeFields(documentId)
    },
    staleTime: Infinity,
  })

/** one call per pointed-at selection; saves nothing, so there is nothing to invalidate */
export const useSuggestField = () =>
  useMutation({
    mutationFn: (input: SuggestFieldInput) => {
      requireAiBuilder()
      return suggestField(input)
    },
  })

/** one call per drawn rectangle; saves nothing, so there is nothing to invalidate */
export const useSuggestTable = () =>
  useMutation({
    mutationFn: (input: SuggestTableInput) => {
      requireAiBuilder()
      return suggestTable(input)
    },
  })

/** saves nothing, so there is nothing to invalidate */
export const useTestExtract = () =>
  useMutation({
    mutationFn: (input: TestExtractInput) => {
      requireAiBuilder()
      return testExtract(input)
    },
  })

/**
 * Values and confidence of an unsaved schema on one document (the same call as `useTestExtract`,
 * read as a query so it reruns when a field's type or hint changes). Saves nothing.
 */
export const useTestExtractPreview = (documentId: string, fields: FieldDef[], actions: FieldAction[] = []) =>
  useQuery({
    queryKey: builderKeys.preview(documentId, fields, actions),
    queryFn: () => {
      requireAiBuilder()
      return testExtract({ documentId, fields, actions })
    },
    enabled: fields.length > 0,
    placeholderData: keepPreviousData,
  })

/** The same query as `useTestExtractPreview` for several documents (shared cache), in the order of `documentIds`. */
export const useTestExtractPreviews = (documentIds: string[], fields: FieldDef[], actions: FieldAction[] = []) =>
  useQueries({
    queries: documentIds.map((documentId) => ({
      queryKey: builderKeys.preview(documentId, fields, actions),
      queryFn: () => {
        requireAiBuilder()
        return testExtract({ documentId, fields, actions })
      },
      enabled: fields.length > 0,
      placeholderData: keepPreviousData,
    })),
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
    }) => {
      requireAiBuilder()
      return addFieldExample(typeId, fieldId, example)
    },
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
