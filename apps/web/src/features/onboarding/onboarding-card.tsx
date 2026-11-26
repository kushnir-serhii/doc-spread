import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface OnboardingCardProps {
  /** Narrow for forms, wide for steps with cards to pick from. */
  width: 'narrow' | 'wide'
  /** Omitted when the step is the only one shown (the real app has no company step until spec 033). */
  step?: number
  title: string
  children: ReactNode
}

export const OnboardingCard = ({ width, step, title, children }: OnboardingCardProps) => (
  <div
    className={cn(
      'w-full rounded-xl border bg-card p-6 shadow-sm md:p-8',
      width === 'narrow' ? 'max-w-sm' : 'max-w-3xl',
    )}
  >
    {step !== undefined && <p className="text-xs font-medium text-muted-foreground">Step {step} of 2</p>}
    <h1 className="mt-1 mb-6 text-xl font-semibold tracking-tight">{title}</h1>
    {children}
  </div>
)
