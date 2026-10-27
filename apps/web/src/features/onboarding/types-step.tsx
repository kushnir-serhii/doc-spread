import { useId, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { draftFromTemplate } from '@/features/document-types/type-draft'
import { useCreateDocumentTypes, useTemplates } from '@/lib/api'
import { cn } from '@/lib/utils'
import { CreatedTypesList } from './created-types-list'
import { TemplatePicker } from './template-picker'

const splitIds = (raw: string | null) => (raw ?? '').split(',').filter(Boolean)

export const TypesStep = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const templates = useTemplates()
  const create = useCreateDocumentTypes()
  const [triedEmpty, setTriedEmpty] = useState(false)

  const selected = splitIds(searchParams.get('selected'))
  const created = splitIds(searchParams.get('created'))
  const nothingChosen = selected.length === 0 && created.length === 0
  const showEmptyMessage = triedEmpty && nothingChosen
  const emptyId = useId()

  const toggle = (templateId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const ids = splitIds(next.get('selected'))
        const updated = ids.includes(templateId) ? ids.filter((id) => id !== templateId) : [...ids, templateId]
        if (updated.length > 0) next.set('selected', updated.join(','))
        else next.delete('selected')
        return next
      },
      { replace: true },
    )
  }

  const finish = () => {
    const chosen = (templates.data ?? []).filter((t) => selected.includes(t.id))
    if (chosen.length === 0) {
      if (created.length > 0) void navigate('/inbox')
      else setTriedEmpty(true)
      return
    }
    create.mutate(chosen.map(draftFromTemplate), { onSuccess: () => void navigate('/inbox') })
  }

  const sampleReturn = new URLSearchParams({ step: 'types' })
  if (selected.length > 0) sampleReturn.set('selected', selected.join(','))
  if (created.length > 0) sampleReturn.set('created', created.join(','))
  const sampleTo = `/types/new?${new URLSearchParams({ from: 'sample', returnTo: `/onboarding?${sampleReturn}` })}`

  const touch = 'min-h-touch md:min-h-9'
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Pick the templates that match your documents, or show us a sample. You can change this later.
      </p>
      <TemplatePicker
        selected={selected}
        disabled={create.isPending}
        onToggle={toggle}
        describedBy={showEmptyMessage ? emptyId : undefined}
      />
      <CreatedTypesList ids={created} />

      {showEmptyMessage && (
        <p id={emptyId} role="alert" className="text-sm text-destructive">
          Pick at least one template, or{' '}
          <Link to="/inbox" className="underline">
            skip
          </Link>
          .
        </p>
      )}
      {create.isError && (
        <div role="alert" className="flex flex-col items-start gap-3 text-sm text-destructive">
          <p>Could not create the document types. Nothing was saved.</p>
          <Button type="button" variant="outline" className={touch} onClick={finish}>
            Retry
          </Button>
        </div>
      )}

      {/* Mobile: navigation row on top, then full-width actions with Finish last (thumb zone).
          sm+: one row, navigation left, actions right. DOM order = visual order on both. */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <Button asChild variant="ghost" className={cn(touch, 'justify-self-start')}>
          <Link to="/onboarding?step=company">Back</Link>
        </Button>
        <Button asChild variant="ghost" className={cn(touch, 'justify-self-end')}>
          <Link to="/inbox">Skip for now</Link>
        </Button>
        <Button asChild variant="outline" className={cn(touch, 'col-span-2 sm:ml-auto')}>
          <Link to={sampleTo}>From a sample</Link>
        </Button>
        <Button
          type="button"
          className={cn(touch, 'col-span-2')}
          disabled={create.isPending || templates.isPending}
          aria-describedby={showEmptyMessage ? emptyId : undefined}
          onClick={finish}
        >
          {create.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {create.isPending ? 'Creating…' : 'Finish'}
        </Button>
      </div>
    </div>
  )
}
