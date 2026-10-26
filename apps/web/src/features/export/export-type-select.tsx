import { useId } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DocumentType } from '@/lib/mock/types'

interface ExportTypeSelectProps {
  types: DocumentType[]
  /** the ?type= value; may be unknown or null */
  value: string | null
  /** approved documents per type id; undefined while loading */
  approvedCounts: Map<string, number> | undefined
  onChange: (typeId: string) => void
}

export const ExportTypeSelect = ({ types, value, approvedCounts, onChange }: ExportTypeSelectProps) => {
  const id = useId()
  const known = types.some((type) => type.id === value)
  return (
    <div className="flex max-w-sm flex-col gap-1.5">
      <Label htmlFor={id}>Document type</Label>
      <Select value={known && value ? value : ''} onValueChange={onChange}>
        <SelectTrigger id={id} className="min-h-touch w-full md:min-h-9">
          <SelectValue placeholder="Choose a type to export" />
        </SelectTrigger>
        <SelectContent>
          {types.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
              {approvedCounts && <span className="text-muted-foreground"> · {approvedCounts.get(type.id) ?? 0} approved</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
