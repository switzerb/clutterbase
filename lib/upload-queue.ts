export type UploadJob = {
  itemId: string
  filePath: string
  title: string
  file: File
  uploaded: boolean
}

export type RegistrationResult = { itemId: string; warning?: string } | { error: string }

export async function runUploadJob(job: UploadJob, operations: {
  upload: (job: UploadJob) => Promise<{ error: { message: string; statusCode?: string } | null }>
  register: (job: UploadJob) => Promise<RegistrationResult>
}): Promise<RegistrationResult> {
  if (!job.uploaded) {
    const { error } = await operations.upload(job)
    // A lost upload response may leave the original in storage. Never overwrite it;
    // registration verifies that the stable path exists before recording the item.
    if (error && error.statusCode !== '409') return { error: 'Could not upload the file. Please retry.' }
    job.uploaded = true
  }
  return operations.register(job)
}

// One queue per upload page, shared by new batches and retries.
export function createUploadQueue(concurrency: number) {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Invalid concurrency')
  let active = 0
  const pending: { key: string; run: () => Promise<void>; resolve: () => void; reject: (error: unknown) => void }[] = []
  const scheduled = new Set<string>()

  function drain() {
    while (active < concurrency && pending.length > 0) {
      const task = pending.shift()!
      active++
      const finish = () => {
        active--
        scheduled.delete(task.key)
        drain()
      }
      void Promise.resolve().then(task.run).then(() => {
        finish()
        task.resolve()
      }, error => {
        finish()
        task.reject(error)
      })
    }
  }

  return {
    enqueue(key: string, run: () => Promise<void>): Promise<void> {
      if (scheduled.has(key)) return Promise.resolve()
      scheduled.add(key)
      const completion = new Promise<void>((resolve, reject) => pending.push({ key, run, resolve, reject }))
      drain()
      return completion
    },
  }
}

export function uploadPath(itemId: string, filename: string): string {
  const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : ''
  const safeExtension = extension && /^[a-z0-9]{1,12}$/.test(extension) ? extension : 'bin'
  return `items/${itemId}/original.${safeExtension}`
}
