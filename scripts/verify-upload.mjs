// Run with the app on port 5290: vp node scripts/verify-upload.mjs
// A synthetic local file is selected through CDP. Only its name is displayed; no
// contents are read, transferred, or saved. The outcome examples are unrelated.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const directory = '.working/verification/upload'
await mkdir(directory, { recursive: true })
const file = resolve(directory, 'synthetic-local.txt')
await writeFile(file, 'synthetic upload verification bytes')
const browser = await openBrowser()
try {
  const { command, evaluate } = browser
  const requests = []
  browser.onEvent((event) => {
    if (event.method === 'Network.requestWillBeSent') requests.push(event.params.request)
  })
  await command('Network.enable')
  const results = {}
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
      await command('Page.navigate', { url: 'about:blank' })
      await evaluate(`new Promise(resolve => {
        const check = () => location.href === 'about:blank' ? resolve() : requestAnimationFrame(check);
        check();
      })`)
      await command('Page.navigate', { url: `${origin}/upload` })
      let ready = false
      const deadline = Date.now() + 10000
      while (!ready && Date.now() < deadline) {
        try {
          ready = await evaluate(
            `location.pathname === '/upload' && !!document.querySelector('#upload-files')`,
          )
        } catch {
          // Navigation can replace the execution context.
        }
      }
      assert.ok(ready, 'Upload did not load')
      // Tab from the focused heading exercises keyboard reachability, not programmatic input focus.
      await evaluate(`document.querySelector('h1').focus()`)
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
      assert.equal(
        await evaluate('document.activeElement.id'),
        'upload-files',
        await evaluate('document.activeElement.outerHTML'),
      )
      const before = requests.length
      const { root } = await command('DOM.getDocument')
      const { nodeId } = await command('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: '#upload-files',
      })
      await command('DOM.setFileInputFiles', { nodeId, files: [file] })
      await evaluate(
        `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
      )
      const state = await evaluate(`(() => {
        const input = document.querySelector('#upload-files');
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          height: input.getBoundingClientRect().height,
          selected: input.files[0]?.name,
          text: document.querySelector('main').innerText,
          focus: document.activeElement.id,
        };
      })()`)
      assert.equal(state.overflow, false)
      assert.ok(state.height >= 48)
      assert.equal(state.selected, 'synthetic-local.txt')
      assert.equal(state.focus, 'upload-files')
      assert.ok(state.text.includes('Selected locally only — not uploaded'))
      assert.ok(state.text.includes('synthetic-local.txt'))
      for (const label of ['Simulated complete', 'Simulated failed', 'Simulated waiting'])
        assert.ok(state.text.includes(label))
      const afterSelection = requests.slice(before)
      assert.ok(
        afterSelection.every(
          (request) =>
            request.method === 'GET' &&
            !request.hasPostData &&
            !request.url.includes('synthetic-local') &&
            !request.url.includes('synthetic%20upload'),
        ),
        'Selection caused a file-related request',
      )
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(`${directory}/${theme}-${width}.png`, Buffer.from(screenshot.data, 'base64'))
      results[`${theme}-${width}`] = {
        overflow: state.overflow,
        height: state.height,
        focus: state.focus,
        selected: state.selected,
        requestsAfterSelection: afterSelection,
      }
    }
  }
  assert.ok(
    requests.every((request) => request.method === 'GET' && !request.hasPostData),
    'Unexpected request method or body',
  )
  const evidence = {
    browser: (await browser.version()).product,
    origin,
    results,
    requests: requests.map(({ method, url, hasPostData }) => ({
      method,
      url,
      hasPostData: !!hasPostData,
    })),
  }
  await writeFile(`${directory}/results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
