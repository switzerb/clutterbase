// Dependency-free real-browser check. Start `vp run preview` before running this file.
// Results are local artifacts under .working/verification/navigation/.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173'
const executable =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profile = await mkdtemp(join(tmpdir(), 'clutterbase-navigation-'))
const chrome = spawn(
  executable,
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
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = ''
    chrome.on('error', reject)
    chrome.on('exit', (code) => reject(new Error(`Chrome exited before connecting: ${code}`)))
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
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    const request = pending.get(message.id)
    if (request) {
      pending.delete(message.id)
      if (message.error) request.reject(new Error(JSON.stringify(message.error)))
      else request.resolve(message.result)
    }
  })
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const requestId = ++id
      pending.set(requestId, { resolve, reject })
      socket.send(JSON.stringify({ id: requestId, method, params, sessionId }))
    })
  }
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const command = (method, params) => send(method, params, sessionId)
  async function evaluate(expression) {
    const response = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    assert.equal(response.exceptionDetails, undefined, JSON.stringify(response.exceptionDetails))
    return response.result.value
  }
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  })
  async function load(method, params = {}) {
    const loaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.removeEventListener('message', listener)
        reject(new Error('Page load timed out'))
      }, 10000)
      function listener({ data }) {
        const message = JSON.parse(data)
        if (message.sessionId === sessionId && message.method === 'Page.loadEventFired') {
          clearTimeout(timeout)
          socket.removeEventListener('message', listener)
          resolve()
        }
      }
      socket.addEventListener('message', listener)
    })
    await command(method, params)
    await loaded
  }
  async function waitForHeading(heading, focused = false) {
    assert.equal(
      await evaluate(`new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), 10000);
        const check = () => {
          const h1 = document.querySelector('main h1');
          if (h1?.textContent.trim() === ${JSON.stringify(heading)} &&
              document.title === ${JSON.stringify(heading + ' · Clutterbase')} &&
              (!${focused} || document.activeElement === h1)) {
            clearTimeout(timer); resolve(true);
          } else requestAnimationFrame(check);
        };
        check();
      })`),
      true,
      `Timed out waiting for ${heading}${focused ? ' and heading focus' : ''}`,
    )
  }
  async function visit(path, heading) {
    await load('Page.navigate', { url: new URL(path, origin).href })
    await waitForHeading(heading)
    await load('Page.reload')
    await waitForHeading(heading)
  }
  for (const [path, heading] of [
    ['/', 'Archive'],
    ['/inbox', 'Inbox'],
    ['/family', 'Family'],
    ['/upload', 'Upload files'],
    ['/archive/sample-item', 'Sample item'],
    ['/archive/sample-item/', 'Sample item'],
    ['/archive/sample-item/extra', 'Page not found'],
    ['/archive/no-such-item', 'Item not found'],
    ['/no-such-page', 'Page not found'],
  ])
    await visit(path, heading)
  await visit('/', 'Archive')
  async function key(key, code, windowsVirtualKeyCode) {
    for (const type of ['keyDown', 'keyUp']) {
      await command('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode })
    }
  }
  await key('Tab', 'Tab', 9)
  assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Skip to main content')
  await key('Enter', 'Enter', 13)
  assert.equal(await evaluate("document.activeElement === document.querySelector('main')"), true)
  await load('Page.reload')
  await waitForHeading('Archive')
  // Reset sequential focus after the skip-link hash navigation and reload.
  await evaluate('document.body.tabIndex = -1; document.body.focus()')
  const visited = []
  for (let i = 0; i < 12; i++) {
    await key('Tab', 'Tab', 9)
    const current = await evaluate(`(() => ({
      text: document.activeElement.textContent.trim(),
      inNav: !!document.activeElement.closest('nav[aria-label="Primary"]')
    }))()`)
    if (current.inNav) visited.push(current.text)
    if (current.inNav && current.text === 'Family') break
  }
  assert.deepEqual(visited, ['Archive', 'Inbox', 'Family'])
  await key('Enter', 'Enter', 13)
  await waitForHeading('Family', true)
  await evaluate('history.back()')
  await waitForHeading('Archive', true)
  await evaluate('history.forward()')
  await waitForHeading('Family', true)
  const settingsTarget = await send('Target.createTarget', { url: 'chrome://settings/' })
  const settingsSession = (
    await send('Target.attachToTarget', { targetId: settingsTarget.targetId, flatten: true })
  ).sessionId
  const zoom = await send(
    'Runtime.evaluate',
    { expression: 'chrome.settingsPrivate.setDefaultZoom(2)', returnByValue: true },
    settingsSession,
  )
  assert.equal(zoom.exceptionDetails, undefined, JSON.stringify(zoom.exceptionDetails))
  await visit('/', 'Archive')
  async function layout() {
    const result = await evaluate(`(() => ({
      width: innerWidth, ratio: devicePixelRatio,
      overflow: document.documentElement.scrollWidth > innerWidth,
      links: [...document.querySelectorAll('nav a')].map(a => {
        const r = a.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.width > 0 && r.height > 0;
      })
    }))()`)
    assert.equal(result.overflow, false)
    assert.equal(result.links.length, 4)
    assert.ok(result.links.every(Boolean))
    return result
  }
  const appearances = {}
  for (const theme of ['light', 'dark']) {
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    })
    const zoomMetrics = await layout()
    assert.equal(zoomMetrics.width, 683)
    assert.equal(zoomMetrics.ratio, 2)
    appearances[theme] = { zoom200: zoomMetrics }
  }
  const reset = await send(
    'Runtime.evaluate',
    { expression: 'chrome.settingsPrivate.setDefaultZoom(1)', returnByValue: true },
    settingsSession,
  )
  assert.equal(reset.exceptionDetails, undefined, JSON.stringify(reset.exceptionDetails))
  await visit('/', 'Archive')
  for (const theme of ['light', 'dark']) {
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    })
    for (const width of [1366, 320]) {
      await command('Emulation.setDeviceMetricsOverride', {
        width,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false,
      })
      const result = await layout()
      assert.equal(result.width, width)
      assert.equal(result.ratio, 1)
      appearances[theme][`viewport${width}`] = result
    }
  }
  const evidence = {
    browser: (await send('Browser.getVersion')).product,
    origin,
    checks: {
      directRoutesAndReloads: 'passed',
      skipLinkActivation: 'passed',
      keyboardRouteFocus: 'passed',
      backAndForwardTitleAndFocus: 'passed',
      zoom: '200% Chrome default page zoom at 1366×768 device viewport',
    },
    appearances,
  }
  await mkdir('.working/verification/navigation', { recursive: true })
  await writeFile(
    '.working/verification/navigation/navigation-verification.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  )
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  socket?.close()
  const exited = once(chrome, 'exit')
  chrome.kill()
  await exited
  await rm(profile, { recursive: true, force: true })
}
