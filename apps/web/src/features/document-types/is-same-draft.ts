import type { TypeDraft } from './type-draft'

/**
 * The draft is plain JSON, so serializing compares it deeply. Key order follows the reducer, which
 * only reorders after a type change; the worst case is a false "unsaved changes", never a missed one.
 */
export const isSameDraft = (a: TypeDraft, b: TypeDraft) => JSON.stringify(a) === JSON.stringify(b)
