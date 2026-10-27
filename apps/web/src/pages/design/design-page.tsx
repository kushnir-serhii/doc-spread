import { Download, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { ConfidenceBadge } from '@/components/domain/confidence-badge'
import { StatusBadge } from '@/components/domain/status-badge'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoney } from '@/lib/mock/format'
import { DOCUMENT_STATUSES } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { FieldTypesSection } from './field-types-section'
import { ViewerSection } from './viewer-section'
import { useFormatLocale } from '@/lib/format-locale/use-format-locale'

/* Class strings are written out in full so Tailwind can see them. */

const SURFACES = [
  { name: 'background', className: 'bg-background text-foreground' },
  { name: 'card', className: 'bg-card text-card-foreground' },
  { name: 'muted', className: 'bg-muted text-muted-foreground' },
  { name: 'sidebar', className: 'bg-sidebar text-sidebar-foreground' },
  { name: 'accent (hover)', className: 'bg-accent text-accent-foreground' },
  { name: 'border', className: 'bg-border text-foreground' },
]

const SEMANTIC = [
  { name: 'primary', solid: 'bg-primary text-primary-foreground', soft: 'bg-primary-soft text-primary-soft-foreground' },
  { name: 'success', solid: 'bg-success text-success-foreground', soft: 'bg-success-soft text-success-soft-foreground' },
  { name: 'warning', solid: 'bg-warning text-warning-foreground', soft: 'bg-warning-soft text-warning-soft-foreground' },
  { name: 'danger', solid: 'bg-danger text-danger-foreground', soft: 'bg-danger-soft text-danger-soft-foreground' },
  { name: 'info', solid: 'bg-info text-info-foreground', soft: 'bg-info-soft text-info-soft-foreground' },
  { name: 'neutral', solid: 'bg-foreground text-background', soft: 'bg-neutral-soft text-neutral-soft-foreground' },
]

const TYPE_SCALE = [
  { token: 'text-4xl', className: 'text-4xl font-semibold tracking-tight', use: 'Landing hero' },
  { token: 'text-3xl', className: 'text-3xl font-semibold tracking-tight', use: 'Landing sections' },
  { token: 'text-2xl', className: 'text-2xl font-semibold tracking-tight', use: 'Page title' },
  { token: 'text-xl', className: 'text-xl font-semibold', use: 'Card / dialog title' },
  { token: 'text-lg', className: 'text-lg font-medium', use: 'Section heading' },
  { token: 'text-base', className: 'text-base', use: 'Long-form body, forms on mobile' },
  { token: 'text-sm', className: 'text-sm', use: 'Default UI text, tables' },
  { token: 'text-xs', className: 'text-xs text-muted-foreground', use: 'Captions, badges, meta' },
]

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16]
const SPACING_WIDTH: Record<number, string> = {
  1: 'w-1',
  2: 'w-2',
  3: 'w-3',
  4: 'w-4',
  6: 'w-6',
  8: 'w-8',
  12: 'w-12',
  16: 'w-16',
}

const RADII = [
  { token: 'rounded-sm', className: 'rounded-sm' },
  { token: 'rounded-md', className: 'rounded-md' },
  { token: 'rounded-lg', className: 'rounded-lg' },
  { token: 'rounded-xl', className: 'rounded-xl' },
  { token: 'rounded-full', className: 'rounded-full' },
]

const SHADOWS = [
  { token: 'shadow-xs', className: 'shadow-xs' },
  { token: 'shadow-sm', className: 'shadow-sm' },
  { token: 'shadow-md', className: 'shadow-md' },
  { token: 'shadow-lg', className: 'shadow-lg' },
]

interface SectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
}

const Section = ({ id, title, description, children }: SectionProps) => {
  return (
    <section aria-labelledby={id} className="rounded-xl border bg-card p-4 shadow-xs md:p-6">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

interface TokenNameProps {
  children: ReactNode
}

const TokenName = ({ children }: TokenNameProps) => {
  return <code className="font-mono text-xs text-muted-foreground">{children}</code>
}

const DesignPage = () => {
  const locale = useFormatLocale()
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Design tokens"
        description="Single source: src/styles/index.css. Toggle the theme in the header to check dark mode."
      />

      <Section id="colors" title="Colors" description="Cool neutral palette + one blue accent. Soft = tinted background with AA text.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SURFACES.map((s) => (
            <div key={s.name} className="flex flex-col gap-1.5">
              <div className={cn('flex h-16 items-end rounded-lg border p-2 text-xs font-medium', s.className)}>Aa</div>
              <TokenName>{s.name}</TokenName>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SEMANTIC.map((c) => (
            <div key={c.name} className="overflow-hidden rounded-lg border">
              <div className={cn('flex h-12 items-center justify-between px-3 text-sm font-medium', c.solid)}>
                <span>{c.name}</span>
                <span className="text-xs opacity-90">solid</span>
              </div>
              <div className={cn('flex h-12 items-center justify-between px-3 text-sm font-medium', c.soft)}>
                <span>{c.name}-soft</span>
                <span className="text-xs opacity-90">soft</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="status"
        title="Document status"
        description="Uploaded → Processing → Needs review | Unclassified → Approved → Exported, plus Rejected and Error. Icon + label, never color alone."
      >
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section id="confidence" title="AI confidence" description="Bar meter + label. Low-confidence fields get a highlighted container in Review.">
        <div className="flex flex-wrap gap-2">
          <ConfidenceBadge level="high" score={0.98} />
          <ConfidenceBadge level="medium" score={0.74} />
          <ConfidenceBadge level="low" score={0.41} />
          <ConfidenceBadge level="high" />
          <ConfidenceBadge level="medium" />
          <ConfidenceBadge level="low" />
          <ConfidenceBadge score={0.86} />
        </div>
        <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="demo-number">Document number</Label>
              <ConfidenceBadge level="high" score={0.99} />
            </div>
            <Input id="demo-number" defaultValue="FV/2026/10/0142" />
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg bg-confidence-low-bg p-2 ring-1 ring-confidence-low-dot/50 ring-inset">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="demo-vat">VAT ID</Label>
              <ConfidenceBadge level="low" score={0.41} />
            </div>
            <Input id="demo-vat" defaultValue="DE81 2345 678" className="bg-card" />
          </div>
        </div>
      </Section>

      <Section
        id="field-types"
        title="Field types"
        description="Every type a document field can have, and how its value is formatted."
      >
        <FieldTypesSection />
      </Section>

      <Section id="viewer" title="Document viewer" description="Pages render only near the viewport. Zoom: fit width, 100%, steps from 50% to 300%.">
        <ViewerSection />
      </Section>

      <Section id="amounts" title="Amounts" description="Use the `amount` utility (tabular-nums), right-align in tables, always show currency.">
        <div className="max-w-sm divide-y rounded-lg border text-sm">
          {[
            { label: 'Net', amount: 1248000, currency: 'USD' },
            { label: 'Tax 8%', amount: 99840, currency: 'USD' },
            { label: 'Gross', amount: 1347840, currency: 'USD' },
            { label: 'Gross', amount: 111111, currency: 'EUR' },
          ].map(({ label, amount, currency }) => (
            <div key={`${label}-${currency}`} className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground">{label}</span>
              <span className="amount font-medium">
                {formatMoney(amount, currency, locale)} <span className="text-muted-foreground">{currency}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Type scale" description="System UI font. 14px (text-sm) is the default for app UI.">
        <div className="flex flex-col divide-y">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <div className="w-40 shrink-0">
                <TokenName>{t.token}</TokenName>
                <p className="text-xs text-muted-foreground">{t.use}</p>
              </div>
              <p className={cn('min-w-0 truncate', t.className)}>Quarterly report, Nordwind GmbH</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="buttons" title="Buttons" description="Primary for the one main action per screen. Destructive only for irreversible actions.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus aria-hidden="true" /> Approve
          </Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">
            <Download aria-hidden="true" /> Export
          </Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">
            <Trash2 aria-hidden="true" /> Reject
          </Button>
          <Button variant="link">Learn more</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="lg" className="min-h-touch">
            Touch 44px
          </Button>
        </div>
      </Section>

      <Section id="focus" title="Focus states" description="Press Tab to move through these. Every interactive element shows a 2px accent ring with offset.">
        <div className="flex flex-wrap items-end gap-3">
          <Button>Button</Button>
          <Button variant="outline">Outline</Button>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="demo-focus">Input</Label>
            <Input id="demo-focus" placeholder="Type here" className="w-56" />
          </div>
          <a href="#focus" className="rounded-sm text-sm text-primary underline underline-offset-4">
            Text link
          </a>
        </div>
      </Section>

      <Section id="shape" title="Spacing, radius, shadow" description="4px spacing grid. Radius base 8px (rounded-lg).">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-4">
            {SPACING.map((n) => (
              <div key={n} className="flex flex-col items-center gap-1.5">
                <div className={cn('h-8 rounded-sm bg-primary', SPACING_WIDTH[n])} />
                <TokenName>{n * 4}px</TokenName>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {RADII.map((r) => (
              <div key={r.token} className="flex flex-col items-center gap-1.5">
                <div className={cn('size-16 border-2 border-primary bg-primary-soft', r.className)} />
                <TokenName>{r.token}</TokenName>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 rounded-lg bg-muted p-6">
            {SHADOWS.map((s) => (
              <div key={s.token} className="flex flex-col items-center gap-2">
                <div className={cn('size-20 rounded-lg bg-card', s.className)} />
                <TokenName>{s.token}</TokenName>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

export default DesignPage
