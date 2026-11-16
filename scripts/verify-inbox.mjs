// Start the app on port 5290, then run: vp node scripts/verify-inbox.mjs
// Synthetic examples: summer-letter and long-filename need review; garden-afternoon is reviewed.
// List selection is illustrative; no review completion, reopening, or history is connected.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const directory = '.working/verification/inbox'
const browser = await openBrowser()
try {
  const { command, evaluate } = browser
  const results = {}
  await mkdir(directory, { recursive: true })
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
      await command('Page.navigate', { url: `${origin}/inbox` })
      let ready = false
      const deadline = Date.now() + 10000
      while (!ready && Date.now() < deadline) {
        try {
          ready = await evaluate(
            `location.pathname === '/inbox' && !!document.querySelector('#inbox-list')`,
          )
        } catch {
          // Navigation can replace the execution context.
        }
      }
      assert.equal(ready, true, 'Inbox did not load')
      const initial = await evaluate(`(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        value: document.querySelector('#inbox-list').value,
        height: document.querySelector('#inbox-list').getBoundingClientRect().height,
        links: [...document.querySelectorAll('main li a')].map(a => a.getAttribute('href')),
      }))()`)
      assert.equal(initial.overflow, false)
      assert.equal(initial.value, 'Needs review')
      assert.ok(initial.height >= 48)
      assert.deepEqual(initial.links, ['/archive/summer-letter', '/archive/long-filename'])
      const initialScreenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        `${directory}/${theme}-${width}-needs-review.png`,
        Buffer.from(initialScreenshot.data, 'base64'),
      )
      await evaluate(`document.querySelector('#inbox-list').focus()`)
      assert.equal(await evaluate(`document.activeElement.id`), 'inbox-list')
      for (const [key, code, windowsVirtualKeyCode] of [['ArrowDown', 'ArrowDown', 40]]) {
        for (const type of ['keyDown', 'keyUp']) {
          await command('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode })
        }
      }
      await evaluate(
        `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
      )
      const reviewed = await evaluate(`(() => ({
        value: document.querySelector('#inbox-list').value,
        heading: document.querySelector('#inbox-list-heading').textContent.trim(),
        link: document.querySelector('main li a').getAttribute('href'),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }))()`)
      assert.deepEqual(reviewed, {
        value: 'Reviewed',
        heading: 'Reviewed',
        link: '/archive/garden-afternoon',
        overflow: false,
      })
      results[`${theme}-${width}`] = { initial, reviewed, keyboard: 'ArrowDown' }
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        `${directory}/${theme}-${width}-reviewed.png`,
        Buffer.from(screenshot.data, 'base64'),
      )
    }
  }
  const evidence = { browser: (await browser.version()).product, origin, results }
  await writeFile(`${directory}/results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
