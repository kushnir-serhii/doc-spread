import { useState } from 'react'
import { useSearchParams } from 'react-router'

export const MAX_SAMPLES = 5

export const SAMPLES_FULL_MESSAGE = `Up to ${MAX_SAMPLES} samples. Remove one to add another.`

export type AddSampleResult = 'added' | 'full' | 'duplicate'

/** The sample documents (up to 5, in the order added) and which one is shown; the shown one lives in `?sample=`. */
export const useSamples = (initial: string[]) => {
  const [ids, setIds] = useState(() => [...new Set(initial)].slice(0, MAX_SAMPLES))
  const [params, setParams] = useSearchParams()
  const requested = params.get('sample')
  const activeId = requested !== null && ids.includes(requested) ? requested : (ids[0] ?? null)

  const setActive = (id: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('sample', id)
        return next
      },
      { replace: true },
    )

  const add = (id: string): AddSampleResult => {
    if (ids.includes(id)) {
      setActive(id)
      return 'duplicate'
    }
    if (ids.length >= MAX_SAMPLES) return 'full'
    setIds([...ids, id])
    setActive(id)
    return 'added'
  }

  /** The last sample can't be removed. Returns whether it was. */
  const remove = (id: string): boolean => {
    if (ids.length <= 1 || !ids.includes(id)) return false
    const rest = ids.filter((x) => x !== id)
    setIds(rest)
    if (activeId === id) setActive(rest[Math.max(0, ids.indexOf(id) - 1)])
    return true
  }

  return { ids, activeId, full: ids.length >= MAX_SAMPLES, setActive, add, remove }
}
