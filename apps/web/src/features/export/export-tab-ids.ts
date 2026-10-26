export type ExportTab = 'new' | 'history'

export const tabId = (tab: ExportTab) => `export-tab-${tab}`
export const panelId = (tab: ExportTab) => `export-panel-${tab}`
