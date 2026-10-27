export const SETTINGS_TABS = ['company', 'recipients', 'team', 'plan'] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

export const DEFAULT_SETTINGS_TAB: SettingsTab = 'company'

export const isSettingsTab = (value: string | null): value is SettingsTab =>
  SETTINGS_TABS.some((tab) => tab === value)

export const tabId = (tab: SettingsTab) => `settings-tab-${tab}`
export const panelId = (tab: SettingsTab) => `settings-panel-${tab}`
