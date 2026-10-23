import { useCallback, useEffect, useRef, useState } from 'react'
import { useUploadDocument } from '@/lib/api'
import type { UploadEntry, UploadPhase } from './upload-entries'

const MAX_CONCURRENT_UPLOADS = 3

interface QueuedFile {
  id: string
  file: File
}

/** Uploads queued files at most 3 at a time. The selected type is read when a file starts. */
export const useUploadQueue = (typeId: string) => {
  const { mutateAsync } = useUploadDocument()
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const pending = useRef<QueuedFile[]>([])
  const active = useRef(0)
  const typeIdRef = useRef(typeId)

  useEffect(() => {
    typeIdRef.current = typeId
  }, [typeId])

  const setPhase = useCallback((id: string, phase: UploadPhase) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, phase } : entry)))
  }, [])

  // only touches refs and stable functions, so a pump captured by an older render is still correct
  const pump = () => {
    while (active.current < MAX_CONCURRENT_UPLOADS && pending.current.length > 0) {
      const next = pending.current.shift()
      if (!next) break
      active.current++
      setPhase(next.id, { kind: 'uploading', progress: 0 })
      mutateAsync({
        file: next.file,
        typeId: typeIdRef.current || undefined,
        onProgress: (progress) => setPhase(next.id, { kind: 'uploading', progress }),
      })
        .then((document) => setPhase(next.id, { kind: 'uploaded', documentId: document.id }))
        .catch((error: unknown) =>
          setPhase(next.id, {
            kind: 'failed',
            reason: error instanceof Error ? error.message : 'Upload failed',
          }),
        )
        .finally(() => {
          active.current--
          pump()
        })
    }
  }

  const add = (added: UploadEntry[]) => {
    setEntries((prev) => [...prev, ...added])
    pending.current.push(...added.map(({ id, file }) => ({ id, file })))
    pump()
  }

  const retry = (id: string) => {
    const entry = entries.find((candidate) => candidate.id === id)
    if (!entry || entry.phase.kind !== 'failed') return
    setPhase(id, { kind: 'queued' })
    pending.current.push({ id, file: entry.file })
    pump()
  }

  const remove = (id: string) => {
    pending.current = pending.current.filter((item) => item.id !== id)
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  return { entries, add, retry, remove }
}
