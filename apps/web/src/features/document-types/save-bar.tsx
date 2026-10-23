import { Button } from '@/components/ui/button'

interface SaveBarProps {
  /** null = a new type */
  version: number | null
  dirty: boolean
  pending: boolean
  /** Message of the last failed save. */
  error: string | null
  /** Message of the last successful save. */
  notice: string | null
  onSave: () => void
}

/** Sticky bar under the back link: what Save does, whether there is anything to save, and how the last save went. */
export const SaveBar = ({ version, dirty, pending, error, notice, onSave }: SaveBarProps) => (
  <div className="sticky top-0 z-10 -mx-1 mb-6 flex flex-col gap-1 border-b bg-background px-1 py-2">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 text-sm">
        {version === null ? (
          <p className="text-muted-foreground">New document type</p>
        ) : (
          <p className="text-muted-foreground">
            Version {version}
            {dirty && <span> · saving creates version {version + 1}</span>}
          </p>
        )}
        {dirty && <p className="font-medium">Unsaved changes</p>}
      </div>
      <Button onClick={onSave} disabled={pending} className="min-h-touch md:min-h-9">
        {pending ? 'Saving…' : version === null ? 'Save type' : 'Save changes'}
      </Button>
    </div>
    {error && (
      <p role="alert" className="text-sm text-destructive">
        Couldn’t save: {error}
      </p>
    )}
    {/* Always rendered so assistive tech has a live region to announce into. */}
    <p role="status" className="text-sm text-muted-foreground empty:hidden">
      {notice}
    </p>
  </div>
)
