import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompany, useUpdateCompany } from '@/lib/api'
import type { Recipient } from '@/lib/mock/types'
import { RecipientForm } from './recipient-form'
import type { RecipientFormValues } from './recipient-form'
import { RecipientRow } from './recipient-row'
import { RemoveRecipientDialog } from './remove-recipient-dialog'

type Editing = { kind: 'none' } | { kind: 'add' } | { kind: 'edit'; id: string }
type Notice = { kind: 'none' } | { kind: 'success' | 'error'; message: string }

const EMPTY_VALUES: RecipientFormValues = { name: '', email: '' }

export const RecipientsTab = () => {
  const company = useCompany()
  const update = useUpdateCompany()
  const [editing, setEditing] = useState<Editing>({ kind: 'none' })
  const [removing, setRemoving] = useState<Recipient | null>(null)
  const [notice, setNotice] = useState<Notice>({ kind: 'none' })

  if (company.isPending) {
    return (
      <div role="status" aria-label="Loading recipients" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (company.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p>Could not load your recipients.</p>
        <Button type="button" variant="outline" className="min-h-touch md:min-h-9" onClick={() => void company.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const recipients = company.data.recipients

  const save = (next: Recipient[], success: string, failure: string, done: () => void) => {
    setNotice({ kind: 'none' })
    update.mutate(
      { recipients: next },
      {
        onSuccess: () => {
          done()
          setNotice({ kind: 'success', message: success })
        },
        onError: (error) => {
          setRemoving(null)
          setNotice({ kind: 'error', message: `${failure}: ${error.message}` })
        },
      },
    )
  }

  const add = (values: RecipientFormValues) =>
    save(
      [...recipients, { id: `rcp-${crypto.randomUUID()}`, ...values }],
      `${values.name} added.`,
      'Couldn’t add the recipient',
      () => setEditing({ kind: 'none' }),
    )

  const edit = (id: string, values: RecipientFormValues) =>
    save(
      recipients.map((item) => (item.id === id ? { ...item, ...values } : item)),
      `${values.name} saved.`,
      'Couldn’t save the recipient',
      () => setEditing({ kind: 'none' }),
    )

  const remove = (target: Recipient) =>
    save(
      recipients.filter((item) => item.id !== target.id),
      `${target.name} removed.`,
      'Couldn’t remove the recipient',
      () => setRemoving(null),
    )

  const editingOpen = editing.kind !== 'none'
  const clearNotice = () => setNotice({ kind: 'none' })
  const cancel = () => {
    clearNotice()
    setEditing({ kind: 'none' })
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Saved recipients appear as choices when you send an export by email (Export → Email).
      </p>

      {recipients.length === 0 && editing.kind !== 'add' && (
        <div className="flex flex-col gap-1 rounded-md border border-dashed p-6 text-sm">
          <p className="font-medium">No recipients yet</p>
          <p className="text-muted-foreground">Add an accountant or anyone who should receive exports.</p>
        </div>
      )}

      {recipients.length > 0 && (
        <ul className="divide-y rounded-md border bg-card">
          {recipients.map((recipient) =>
            editing.kind === 'edit' && editing.id === recipient.id ? (
              <li key={recipient.id} className="p-2">
                <RecipientForm
                  initialValues={{ name: recipient.name, email: recipient.email }}
                  others={recipients.filter((item) => item.id !== recipient.id)}
                  submitLabel="Save"
                  pending={update.isPending}
                  onSubmit={(values) => edit(recipient.id, values)}
                  onCancel={cancel}
                />
              </li>
            ) : (
              <RecipientRow
                key={recipient.id}
                recipient={recipient}
                disabled={editingOpen || update.isPending}
                onEdit={(item) => {
                  clearNotice()
                  setEditing({ kind: 'edit', id: item.id })
                }}
                onRemove={(item) => {
                  clearNotice()
                  setRemoving(item)
                }}
              />
            ),
          )}
        </ul>
      )}

      {editing.kind === 'add' ? (
        <RecipientForm
          initialValues={EMPTY_VALUES}
          others={recipients}
          submitLabel="Add recipient"
          pending={update.isPending}
          onSubmit={add}
          onCancel={cancel}
        />
      ) : (
        <Button
          type="button"
          disabled={editingOpen}
          onClick={() => {
            clearNotice()
            setEditing({ kind: 'add' })
          }}
          className="min-h-touch w-full sm:w-fit md:min-h-9"
        >
          <Plus aria-hidden="true" />
          Add recipient
        </Button>
      )}

      <p
        role={notice.kind === 'error' ? 'alert' : 'status'}
        className={notice.kind === 'error' ? 'text-sm break-words text-destructive' : 'text-sm break-words'}
      >
        {notice.kind === 'none' ? '' : notice.message}
      </p>

      <RemoveRecipientDialog
        recipient={removing}
        pending={update.isPending}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
