import { useSearchParams } from 'react-router'
import { NotAvailableYet } from '@/components/layout/not-available-yet'
import { PageHeader } from '@/components/layout/page-header'
import { CompanyTab } from '@/features/settings/company-tab'
import { PlanTab } from '@/features/settings/plan-tab'
import { RecipientsTab } from '@/features/settings/recipients-tab'
import { DEFAULT_SETTINGS_TAB, isSettingsTab, panelId, tabId } from '@/features/settings/settings-tab-ids'
import type { SettingsTab } from '@/features/settings/settings-tab-ids'
import { SettingsTabs } from '@/features/settings/settings-tabs'
import { TeamTab } from '@/features/settings/team-tab'
import { USE_MOCKS } from '@/lib/env'

const renderPanel = (tab: SettingsTab) => {
  switch (tab) {
    case 'company':
      return <CompanyTab />
    case 'recipients':
      return <RecipientsTab />
    case 'team':
      return <TeamTab />
    case 'plan':
      return <PlanTab />
    default: {
      const unreachable: never = tab
      return unreachable
    }
  }
}

const SettingsContent = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const param = searchParams.get('tab')
  const tab = isSettingsTab(param) ? param : DEFAULT_SETTINGS_TAB

  // switching tabs keeps the other search params; the default tab omits the param
  const changeTab = (next: SettingsTab) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === DEFAULT_SETTINGS_TAB) params.delete('tab')
      else params.set('tab', next)
      return params
    })

  return (
    <>
      <PageHeader title="Settings" description="Company details, export recipients, team and plan." />
      <div className="flex flex-col gap-6">
        <SettingsTabs value={tab} onChange={changeTab} />
        <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
          {renderPanel(tab)}
        </div>
      </div>
    </>
  )
}

/** Settings (company, recipients, team, plan) have no backend yet: with mocks off the page says so instead of showing mock data. */
const SettingsPage = () =>
  USE_MOCKS ? (
    <SettingsContent />
  ) : (
    <>
      <PageHeader title="Settings" description="Company details, export recipients, team and plan." />
      <NotAvailableYet
        title="Not available yet"
        description="Company settings, export recipients, the team and the plan are not available yet."
        backTo="/inbox"
        backLabel="Back to the inbox"
      />
    </>
  )

export default SettingsPage
