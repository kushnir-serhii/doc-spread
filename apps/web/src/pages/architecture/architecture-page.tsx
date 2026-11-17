import { PageHeader } from '@/components/layout/page-header'
import { DiagramTabs } from '@/features/architecture/diagram-tabs'

const ArchitecturePage = () => (
  <div className="space-y-6">
    <PageHeader title="Architecture" description="UML diagrams of how the project is built." />
    <DiagramTabs />
  </div>
)

export default ArchitecturePage
