// Shared by the mock seed modules (data.ts and the document seeds). Not part of the public mock API.

// ---------- deterministic PRNG (mulberry32) ----------
export function makeRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const BASE_NOW = Date.UTC(2026, 9, 20, 9, 30) // 2026-10-20 09:30Z
export const DAY = 86_400_000
export const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)
