import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Minimal CDP client for new, dependency-free browser verification scripts.
export async function openBrowser() {
  const profile = await mkdtemp(join(tmpdir(), 'clutterbase-browser-'))
  const chrome = spawn(
    process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  let socket
  const close = async () => {
    socket?.close()
    if (chrome.exitCode === null && chrome.signalCode === null && chrome.pid) {
      const exited = once(chrome, 'exit')
      chrome.kill()
      await exited
    }
    await rm(profile, { recursive: true, force: true })
  }
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = ''
      chrome.once('error', reject)
      chrome.once('exit', (code) => reject(new Error(`Chrome exited: ${code}`)))
      chrome.stderr.on('data', (chunk) => {
        output += chunk
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
        if (match) resolve(match[1])
      })
    })
    socket = new WebSocket(endpoint)
    await once(socket, 'open')
    let id = 0
    const pending = new Map()
    const listeners = new Set()
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (message.method) {
        for (const listener of listeners) listener(message)
      }
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      if (message.error) request.reject(new Error(JSON.stringify(message.error)))
      else request.resolve(message.result)
    })
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const requestId = ++id
        pending.set(requestId, { resolve, reject })
        socket.send(JSON.stringify({ id: requestId, method, params, sessionId }))
      })
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const command = (method, params = {}) => send(method, params, sessionId)
    const evaluate = async (expression) => {
      const result = await command('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    await command('Page.enable')
    return {
      command,
      send,
      evaluate,
      onEvent: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      version: () => send('Browser.getVersion'),
      close,
    }
  } catch (error) {
    await close()
    throw error
  }
}
