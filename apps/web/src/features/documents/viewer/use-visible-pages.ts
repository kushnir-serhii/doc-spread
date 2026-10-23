import { useEffect, useRef, useState } from 'react'

/**
 * One IntersectionObserver on the scroll container, with a one-viewport margin.
 * Returns the indexes of the pages near the viewport (elements carry data-page-index).
 */
export const useVisiblePages = (pageCount: number) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState<ReadonlySet<number>>(new Set())

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev)
          for (const entry of entries) {
            const index = Number((entry.target as HTMLElement).dataset.pageIndex) // our own data attribute
            if (entry.isIntersecting) next.add(index)
            else next.delete(index)
          }
          return next
        })
      },
      { root, rootMargin: '100% 0px' },
    )
    root.querySelectorAll('[data-page-index]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [pageCount])

  return { containerRef, visible }
}
