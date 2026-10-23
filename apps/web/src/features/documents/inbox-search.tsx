import { useEffect, useId, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEBOUNCE_MS = 250

interface InboxSearchProps {
  /** the committed ?q= value */
  value: string
  onCommit: (value: string) => void
}

/** Typed text is local; it is committed to the URL after a pause. Outside URL changes flow back in. */
export const InboxSearch = ({ value, onCommit }: InboxSearchProps) => {
  const inputId = useId()
  const [text, setText] = useState(value)
  // follow outside changes to ?q= (back button, Clear filters); compare trimmed so a pause after a space keeps it
  const [seenValue, setSeenValue] = useState(value)
  if (value !== seenValue) {
    setSeenValue(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => {
    const next = text.trim()
    if (next === value) return
    const timer = setTimeout(() => onCommit(next), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, value, onCommit])

  return (
    <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
      <Label htmlFor={inputId}>Search documents</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="File name or value"
          className="min-h-touch px-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => setText('')}
            className="absolute top-1/2 right-0 size-touch -translate-y-1/2"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
