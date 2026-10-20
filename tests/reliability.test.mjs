import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkWrite, formText } from '../lib/action-result.ts'
import { createUploadQueue, runUploadJob, uploadPath } from '../lib/upload-queue.ts'

const job = () => ({ itemId: 'stable-id', filePath: 'items/stable-id/original.pdf', title: 'Letter', file: new File(['letter'], 'letter.pdf'), uploaded: false })

test('write failures, denied no-op writes, and network failures never report success', async () => {
  assert.equal(await checkWrite(Promise.resolve({ data: [{ id: 1 }], error: null })), undefined)
  for (const result of [{ data: [], error: null }, { data: null, error: { code: '42501' } }]) {
    assert.equal(typeof (await checkWrite(Promise.resolve(result))).error, 'string')
  }
  assert.equal(typeof (await checkWrite(Promise.reject(new Error('offline')))).error, 'string')
  const data = new FormData()
  data.set('title', new File(['x'], 'x'))
  assert.equal(formText(data, 'title'), '')
  assert.equal(formText(data, 'missing'), '')
})

test('queue shares its concurrency limit across batches, rejects duplicates, and continues after failure', async () => {
  const queue = createUploadQueue(2)
  let active = 0
  let maximum = 0
  let completed = 0
  const releases = []
  const run = async () => {
    maximum = Math.max(maximum, ++active)
    await new Promise(resolve => releases.push(resolve))
    active--
    completed++
  }
  const first = queue.enqueue('a', run)
  const second = queue.enqueue('b', run)
  await queue.enqueue('a', () => { throw new Error('Duplicate ran') })
  const third = queue.enqueue('c', run)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(active, 2)
  releases.shift()()
  await first
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(active, 2)
  while (releases.length) releases.shift()()
  await Promise.all([second, third])
  assert.equal(maximum, 2)
  assert.equal(completed, 3)
  await assert.rejects(queue.enqueue('failure', async () => { throw new Error('failed') }), /failed/)
  await queue.enqueue('after-failure', async () => { completed++ })
  assert.equal(completed, 4)
})

test('retry resumes registration without uploading another original', async () => {
  const entry = job()
  let uploads = 0
  let registrations = 0
  const operations = {
    upload: async () => { uploads++; return { error: null } },
    register: async current => ++registrations === 1 ? { error: 'Database unavailable' } : { itemId: current.itemId },
  }
  assert.deepEqual(await runUploadJob(entry, operations), { error: 'Database unavailable' })
  assert.deepEqual(await runUploadJob(entry, operations), { itemId: 'stable-id' })
  assert.equal(uploads, 1)
  assert.equal(registrations, 2)
})

test('lost upload response retries the same path and recovers from storage conflict', async () => {
  const entry = job()
  const paths = []
  let attempts = 0
  const operations = {
    upload: async current => {
      paths.push(current.filePath)
      if (++attempts === 1) throw new Error('Lost response')
      return { error: { statusCode: '409', message: 'Already exists' } }
    },
    register: async current => ({ itemId: current.itemId }),
  }
  await assert.rejects(runUploadJob(entry, operations), /Lost response/)
  assert.deepEqual(await runUploadJob(entry, operations), { itemId: 'stable-id' })
  assert.deepEqual(paths, [entry.filePath, entry.filePath])
})

test('upload failure does not attempt registration; paths sanitize unusual extensions', async () => {
  const entry = job()
  const result = await runUploadJob(entry, {
    upload: async () => ({ error: { statusCode: '403', message: 'Denied' } }),
    register: async () => { assert.fail('Registration must not run') },
  })
  assert.equal(typeof result.error, 'string')
  assert.equal(entry.uploaded, false)
  assert.equal(uploadPath('id', 'letter.PDF'), 'items/id/original.pdf')
  assert.equal(uploadPath('id', 'no-extension'), 'items/id/original.bin')
  assert.equal(uploadPath('id', 'letter.a/b'), 'items/id/original.bin')
})
