/** Navigation state that carries a success message to the page that follows a save. */
export interface SavedNoticeState {
  savedNotice: string
}

export const savedNoticeState = (savedNotice: string): SavedNoticeState => ({ savedNotice })

export const readSavedNotice = (state: unknown): string | null => {
  if (typeof state !== 'object' || state === null || !('savedNotice' in state)) return null
  return typeof state.savedNotice === 'string' ? state.savedNotice : null
}
