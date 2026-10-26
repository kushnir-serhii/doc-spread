import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCreateDocumentType, useUpdateDocumentType } from '@/lib/api'
import { appendToParam, safeReturnTo } from '@/lib/return-to'
import { describeReextract, computeImpact } from './type-impact'
import { savedNoticeState } from './saved-notice'
import type { TypeDraft } from './type-draft'
import { validateDraft } from './validate-draft'

/** A type that already exists: saving it creates the next version. */
export interface SavedTypeInfo {
  id: string
  version: number
  /** null = not known (yet) */
  documentCount: number | null
}

interface UseTypeSaveOptions {
  draft: TypeDraft
  /** The draft the builder started with; for a saved type, the saved fields. */
  baseline: TypeDraft
  savedType?: SavedTypeInfo
  /** Called after a saved type got its next version. A new type navigates away instead. */
  onSaved?: (notice: string) => void
  /** Runs once the type is stored (before the screen moves on); its text, if any, is added to the success message. */
  afterSave?: (typeId: string) => Promise<string>
}

export type SaveRequest = 'invalid' | 'confirm' | 'saving'

/** Validation, the impact check and the create/update calls behind the Save button. */
export const useTypeSave = ({ draft, baseline, savedType, onSaved, afterSave }: UseTypeSaveOptions) => {
  const navigate = useNavigate()
  const returnTo = safeReturnTo(useSearchParams()[0].get('returnTo'))
  const create = useCreateDocumentType()
  const update = useUpdateDocumentType()
  // Errors show only after the first Save, then follow the draft live.
  const [attempted, setAttempted] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const issues = validateDraft(draft)
  const impact = computeImpact(baseline, draft)
  const nextVersion = savedType ? savedType.version + 1 : 1
  const hasImpact = savedType !== undefined && impact.added + impact.removed > 0
  // Without documents there is nothing to warn about.
  const needsConfirm = hasImpact && savedType.documentCount !== 0

  const run = async (reextract: boolean) => {
    try {
      if (savedType) {
        const next = await update.mutateAsync({ id: savedType.id, patch: draft })
        const queued = reextract && impact.added > 0 ? ` · ${describeReextract(impact.added)}` : ''
        const extra = await afterSave?.(next.id)
        onSaved?.(`Saved as version ${next.version}${queued}${extra ? ` · ${extra}` : ''}`)
      } else {
        const created = await create.mutateAsync(draft)
        const extra = await afterSave?.(created.id)
        // Opened from onboarding: go back there, with the new type in `created`.
        navigate(returnTo ? appendToParam(returnTo, 'created', created.id) : `/types/${created.id}`, {
          replace: true,
          state: savedNoticeState(extra ? `Type saved · ${extra}` : 'Type saved'),
        })
      }
    } catch {
      // The failure is on the mutation (`error`); the draft stays as it is.
    }
  }

  const requestSave = (): SaveRequest => {
    setAttempted(true)
    if (issues.length > 0) return 'invalid'
    if (needsConfirm) {
      setConfirming(true)
      return 'confirm'
    }
    void run(false)
    return 'saving'
  }

  const confirm = (reextract: boolean) => {
    setConfirming(false)
    void run(reextract)
  }

  const mutation = savedType ? update : create
  return {
    issues,
    attempted,
    impact,
    nextVersion,
    confirming,
    pending: mutation.isPending,
    error: mutation.error,
    requestSave,
    confirm,
    cancelConfirm: () => setConfirming(false),
  }
}
