import { cn } from '@/lib/utils'

export const TruncatedText = ({ text, className = 'max-w-64' }: { text: string; className?: string }) => (
  <span title={text} className={cn('block truncate', className)}>
    {text}
  </span>
)
