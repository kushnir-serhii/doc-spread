import type { Token } from '@/lib/mock/types'

/** Faint OCR token outlines (debug aid): shows that the overlay lines up with the backdrop. */
export const TokenOutlines = ({ tokens }: { tokens: Token[] }) => (
  <>
    {tokens.map((t) => (
      <div
        key={t.id}
        className="absolute border border-primary/40"
        // dynamic position: normalized page coordinates
        style={{ left: `${t.bbox.x * 100}%`, top: `${t.bbox.y * 100}%`, width: `${t.bbox.w * 100}%`, height: `${t.bbox.h * 100}%` }}
      />
    ))}
  </>
)
