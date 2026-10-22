import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'

interface PlaceholderPageProps {
  title: string
  description: string
}

/** Temporary page body for screens not built yet. */
const PlaceholderPage = ({ title, description }: PlaceholderPageProps) => {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card p-8 text-center">
        <Construction className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">This screen is next in line.</p>
        <p className="max-w-sm text-sm text-muted-foreground">The shell and design tokens are ready for review first.</p>
      </div>
    </>
  )
}

export default PlaceholderPage
