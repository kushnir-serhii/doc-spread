import { useId, type Ref } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TypeMetaFormProps {
  name: string
  description: string
  /** Shown after a failed Save. */
  nameError: string | null
  nameRef: Ref<HTMLInputElement>
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
}

export const TypeMetaForm = ({ name, description, nameError, nameRef, onNameChange, onDescriptionChange }: TypeMetaFormProps) => {
  const id = useId()
  const helpId = `${id}-description-help`
  return (
    <div className="mb-6 grid max-w-3xl gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Type name</Label>
        <Input
          id={`${id}-name`}
          ref={nameRef}
          aria-invalid={nameError !== null}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          value={name}
          placeholder="e.g. Invoice"
          onChange={(event) => onNameChange(event.target.value)}
          className="min-h-touch md:min-h-9"
        />
        {nameError && (
          <p id={`${id}-name-error`} className="text-xs text-destructive">
            {nameError}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-description`}>Description</Label>
        <Textarea
          id={`${id}-description`}
          value={description}
          aria-describedby={helpId}
          placeholder="e.g. A VAT invoice from a supplier, with a seller, a buyer and line items."
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
        <p id={helpId} className="text-xs text-muted-foreground">
          The AI reads this to decide which documents belong to this type. Say what the document is, not what it
          contains.
        </p>
      </div>
    </div>
  )
}
