'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Card, Spinner } from '@heroui/react'
import { createClient } from '@/lib/supabase/client'
import { createUploadQueue, runUploadJob, uploadPath, type UploadJob } from '@/lib/upload-queue'
import { registerItem } from './actions'

type UploadState =
  | { state: 'pending' }
  | { state: 'uploading' }
  | { state: 'success'; itemId: string; warning?: string }
  | { state: 'error'; message: string }

type UploadEntry = {
  key: string
  file: File
  job: UploadJob
  status: UploadState
}

function deriveTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  return withoutExt
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function UploadPage() {
  const [queue] = useState(() => createUploadQueue(2))
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateEntry(key: string, status: UploadState) {
    setEntries(prev => prev.map(e => (e.key === key ? { ...e, status } : e)))
  }

  const hasUnfinished = entries.some(entry => entry.status.state !== 'success')
  useEffect(() => {
    if (!hasUnfinished) return
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [hasUnfinished])

  function schedule(entry: UploadEntry) {
    updateEntry(entry.key, { state: 'pending' })
    void queue.enqueue(entry.key, async () => {
      updateEntry(entry.key, { state: 'uploading' })
      try {
        const supabase = createClient()
        const result = await runUploadJob(entry.job, {
          upload: job => supabase.storage.from('originals').upload(job.filePath, job.file, { contentType: job.file.type }),
          register: job => registerItem(job.itemId, job.title, job.filePath, job.file.type),
        })
        updateEntry(entry.key, 'error' in result
          ? { state: 'error', message: result.error }
          : { state: 'success', itemId: result.itemId, warning: result.warning })
      } catch {
        updateEntry(entry.key, { state: 'error', message: 'Connection interrupted. Retry to continue this upload.' })
      }
    })
  }

  function addFiles(files: FileList | File[]) {
    const newEntries: UploadEntry[] = Array.from(files).map(file => {
      const itemId = crypto.randomUUID()
      return {
        key: itemId,
        file,
        job: { itemId, file, filePath: uploadPath(itemId, file.name), title: deriveTitle(file.name) || file.name, uploaded: false },
        status: { state: 'pending' },
      }
    })
    setEntries(prev => [...prev, ...newEntries])
    newEntries.forEach(schedule)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-start p-8 gap-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-semibold">Upload files</h1>
      <p className="text-sm text-[var(--muted)]">Two files upload at a time. Keep this page open until uploads finish; retry any failed files here.</p>

      <Card className="w-full">
        <Card.Content>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragging
                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-[var(--border)]'
            }`}
          >
            <p className="text-sm text-[var(--muted)]">Drag files here or</p>
            <Button variant="outline" onPress={() => fileInputRef.current?.click()}>
              Choose files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        </Card.Content>
      </Card>

      {entries.length > 0 && (
        <Card className="w-full">
          <Card.Header>
            <Card.Title>Files</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="flex flex-col">
              {entries.map(entry => (
                <li
                  key={entry.key}
                  className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{entry.file.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {entry.status.state === 'pending' && <span className="text-xs text-[var(--muted)]">Queued</span>}
                    {entry.status.state === 'uploading' && (
                      <Spinner size="sm" color="current" />
                    )}
                    {entry.status.state === 'success' && (
                      <a
                        href={`/items/${entry.status.itemId}`}
                        className="text-xs text-[var(--success)]"
                        title={entry.status.warning}
                      >
                        {entry.status.warning ? 'Uploaded (no thumbnail)' : 'Uploaded'}
                      </a>
                    )}
                    {entry.status.state === 'error' && (
                      <>
                        <span role="alert" className="max-w-[240px] text-xs text-[var(--danger)]">
                          {entry.status.message}
                        </span>
                        <Button variant="outline" onPress={() => schedule(entry)}>
                          Retry
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </main>
  )
}
