// Dependency-free real-browser check. Start `vp run preview` before running this file.
// Screenshots and results are local artifacts under .working/verification/navigation/.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'

const origin = process.env.PREVIEW_URL ?? 'http://localhost:4173'
const executable =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profile = await mkdtemp(join(tmpdir(), 'clutterbase-theme-'))
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
  await command('Page.navigate', { url: origin })
  await loaded
  // Wait on actual page resources, not a fixed artificial delay.
  await evaluate(`new Promise(resolve => {
    const ready = async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
      resolve(true);
    };
    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready, { once: true });
  })`)
  await mkdir('.working/verification/navigation', { recursive: true })
  // The former preview no longer exists. Inject only its public-safe artwork as a
  // browser fixture, so theme pixel coverage remains independent of route content.
  await evaluate(`(async () => {
    const img = document.createElement('img');
    img.src = '/theme-sample.svg'; img.alt = 'Synthetic theme verification artwork';
    img.width = 480; img.height = 160; img.style.maxWidth = '100%';
    document.querySelector('main').append(img); await img.decode();
  })()`)
  const evidence = {
    browser: (await send('Browser.getVersion')).product,
    viewport: '1366x768',
    themes: {},
  }
  // Tab through the shell to the prominent action rather than assuming a button.
  await evaluate('document.body.tabIndex = -1; document.body.focus()')
  for (let i = 0; i < 6; i++) {
    await command('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    })
    await command('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    })
  }
  assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Upload files')
  let originalImage
  for (const theme of ['light', 'dark']) {
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    })
    await evaluate(
      'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
    )
    const result = await evaluate(`(() => {
      const style = getComputedStyle(document.body);
      const button = document.querySelector('nav a[href="/upload"]');
      const image = document.querySelector('img');
      const rect = image.getBoundingClientRect();
      return {
        background: getComputedStyle(document.documentElement).backgroundColor,
        fontSize: style.fontSize,
        buttonHeight: button.getBoundingClientRect().height,
        imageFilter: getComputedStyle(image).filter,
        imageBlend: getComputedStyle(image).mixBlendMode,
        focusOutline: getComputedStyle(button).outlineStyle,
        focusWidth: getComputedStyle(button).outlineWidth,
        imageClip: { x: rect.x + 12, y: rect.y + 12, width: rect.width - 24, height: rect.height - 24, scale: 1 },
        overflow: document.documentElement.scrollWidth > innerWidth
      };
    })()`)
    assert.equal(result.background, theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(23, 28, 25)')
    assert.ok(parseFloat(result.fontSize) >= 18)
    assert.ok(result.buttonHeight >= 48)
    assert.equal(result.imageFilter, 'none')
    assert.equal(result.imageBlend, 'normal')
    assert.equal(result.focusOutline, 'solid')
    assert.equal(result.focusWidth, '2px')
    assert.equal(result.overflow, false)
    const image = await command('Page.captureScreenshot', { clip: result.imageClip })
    if (originalImage)
      assert.equal(image.data, originalImage, 'Artwork pixels must not change with appearance')
    originalImage = image.data
    const screenshot = await command('Page.captureScreenshot')
    await writeFile(
      `.working/verification/navigation/theme-${theme}.png`,
      Buffer.from(screenshot.data, 'base64'),
    )
    evidence.themes[theme] = result
  }
  for (const width of [683, 320]) {
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    })
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false)
  }
  evidence.checks = [
    'Live light → dark change without reload',
    'Identical artwork pixels in both themes',
    '18px body; ≥48px action',
    'Keyboard Tab reaches the action with a visible 2px focus outline in both themes',
    'No horizontal overflow at 1366, 683, or 320 CSS px',
  ]
  await writeFile(
    '.working/verification/navigation/theme-verification.json',
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
