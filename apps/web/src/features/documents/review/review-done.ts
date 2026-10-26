/** Navigation state after Approve or Reject: the leave is intended, and the Inbox may show a message. */
export interface ReviewDoneState {
  reviewDone: true
  notice?: string
}

export const reviewDoneState = (notice?: string): ReviewDoneState => (notice ? { reviewDone: true, notice } : { reviewDone: true })

export const isReviewDone = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && 'reviewDone' in state && state.reviewDone === true

export const readReviewNotice = (state: unknown): string | null =>
  isReviewDone(state) && typeof state === 'object' && state !== null && 'notice' in state && typeof state.notice === 'string'
    ? state.notice
    : null
