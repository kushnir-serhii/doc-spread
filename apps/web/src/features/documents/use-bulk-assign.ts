import { useState } from 'react'
import { useReassignDocumentType } from '@/lib/api'

export interface BulkAssignResult {
  succeeded: string[]
  /** document id -> reason */
  failed: Record<string, string>
}

/** One request per document, one after another; a failure never stops the rest. */
export const useBulkAssign = () => {
  const reassign = useReassignDocumentType()
  const [isRunning, setIsRunning] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const run = async (ids: string[], typeId: string): Promise<BulkAssignResult> => {
    setIsRunning(true)
    setErrors({})
    const result: BulkAssignResult = { succeeded: [], failed: {} }
    for (const id of ids) {
      try {
        await reassign.mutateAsync({ id, typeId })
        result.succeeded.push(id)
      } catch (error) {
        result.failed[id] = error instanceof Error ? error.message : 'Something went wrong.'
      }
    }
    setErrors(result.failed)
    setIsRunning(false)
    return result
  }

  return { run, isRunning, errors, clearErrors: () => setErrors({}) }
}
