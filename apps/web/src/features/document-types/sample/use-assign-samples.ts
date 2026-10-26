import { useDocumentsByIds, useDocumentTypes, useReassignDocumentType } from '@/lib/api'

const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`

/**
 * After Save: samples without a type join the saved type (and show up under it in the Inbox);
 * a sample that already has a type is left as is. Returns the sentence for the success message.
 */
export const useAssignSamples = (sampleIds: string[]) => {
  const documents = useDocumentsByIds(sampleIds)
  const types = useDocumentTypes()
  const reassign = useReassignDocumentType()

  return async (typeId: string): Promise<string> => {
    let assigned = 0
    let failed = 0
    const typed: string[] = []
    for (const { data: doc } of documents) {
      if (!doc) continue
      if (doc.typeId === typeId) continue // already in this type (training a saved one)
      if (doc.typeId !== null) {
        typed.push(types.data?.find((t) => t.id === doc.typeId)?.name ?? 'another type')
      } else if (doc.status !== 'unclassified') {
        failed += 1
      } else {
        try {
          await reassign.mutateAsync({ id: doc.id, typeId })
          assigned += 1
        } catch {
          failed += 1
        }
      }
    }
    const parts: string[] = []
    if (assigned > 0) parts.push(`${assigned} ${assigned === 1 ? 'sample' : 'samples'} assigned`)
    if (typed.length > 0) {
      parts.push(
        typed.length === 1
          ? `1 is ${withArticle(typed[0])} and was left as is`
          : `${typed.length} already have a type and were left as is`,
      )
    }
    if (failed > 0) parts.push(`${failed} couldn’t be assigned`)
    return parts.join('; ')
  }
}
