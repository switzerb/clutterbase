'use client'

import { useRef, useState } from 'react'
import { Button, Card, Spinner } from '@heroui/react'
import { createClient } from '@/lib/supabase/client'
import { registerItem } from './actions'

type UploadState =
  | { state: 'pending' }
  | { state: 'uploading' }
  | { state: 'success'; itemId: string }
  | { state: 'error'; message: string }

type UploadEntry = {
  key: string
  file: File
  status: UploadState
}

function getExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'bin'
}

function deriveTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  return withoutExt
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function buildStoragePath(itemId: string, ext: string): string {
  return `items/${itemId}/original.${ext}`
}

export default function UploadPage() {
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updateEntry(key: string, status: UploadState) {
    setEntries(prev => prev.map(e => (e.key === key ? { ...e, status } : e)))
  }

  async function uploadEntry(entry: UploadEntry) {
    const { key, file } = entry
    updateEntry(key, { state: 'uploading' })

    try {
      const itemId = crypto.randomUUID()
      const ext = getExt(file.name)
      const filePath = buildStoragePath(itemId, ext)
      const title = deriveTitle(file.name)

      const supabase = createClient()
      const { error: storageError } = await supabase.storage
        .from('originals')
        .upload(filePath, file, { contentType: file.type })

      if (storageError) {
        updateEntry(key, { state: 'error', message: storageError.message })
        return
      }

      const result = await registerItem(itemId, title, filePath, file.type)
      if ('error' in result) {
        updateEntry(key, { state: 'error', message: result.error })
        return
      }

      updateEntry(key, { state: 'success', itemId: result.itemId })
    } catch (err) {
      updateEntry(key, {
        state: 'error',
        message: err instanceof Error ? err.message : 'Upload failed',
      })
    }
  }

  function addFiles(files: FileList | File[]) {
    const newEntries: UploadEntry[] = Array.from(files).map(file => ({
      key: crypto.randomUUID(),
      file,
      status: { state: 'pending' },
    }))
    setEntries(prev => [...prev, ...newEntries])
    newEntries.forEach(entry => uploadEntry(entry))
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
                    {entry.status.state === 'uploading' && (
                      <Spinner size="sm" color="current" />
                    )}
                    {entry.status.state === 'success' && (
                      <a
                        href={`/items/${entry.status.itemId}`}
                        className="text-xs text-[var(--success)]"
                      >
                        Uploaded
                      </a>
                    )}
                    {entry.status.state === 'error' && (
                      <>
                        <span className="max-w-[180px] truncate text-xs text-[var(--danger)]">
                          {entry.status.message}
                        </span>
                        <Button variant="outline" onPress={() => uploadEntry(entry)}>
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
