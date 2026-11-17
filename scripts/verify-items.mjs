// Start the app on port 5290, then run: vp node scripts/verify-items.mjs
// Fixture URLs: garden-afternoon (photo), summer-letter (prepared PDF image and mock AI),
// long-filename (sparse), letter-processing, photo-failed. No real PDF rendering occurs.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const browser = await openBrowser()
const directory = '.working/verification/items'
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
      for (const id of ['garden-afternoon', 'summer-letter', 'long-filename']) {
        await command('Page.navigate', { url: `${origin}/archive/${id}` })
        let ready = false
        const deadline = Date.now() + 10000
        while (!ready && Date.now() < deadline) {
          try {
            ready = await evaluate(
              `location.pathname === '/archive/${id}' && !!document.querySelector('nav[aria-label="Breadcrumb"]') && [...document.images].every(i => i.complete)`,
            )
          } catch {
            // Navigation can replace the execution context.
          }
        }
        assert.equal(ready, true, `${id} did not load`)
        const result = await evaluate(`(() => {
          const figure = document.querySelector('main figure').getBoundingClientRect();
          const details = document.querySelector('main figure + div').getBoundingClientRect();
          return { overflow: document.documentElement.scrollWidth > innerWidth,
            stacked: details.top >= figure.bottom, imageFailures: [...document.querySelectorAll('main img')].filter(i => !i.naturalWidth).length,
            breadcrumb: document.querySelector('nav[aria-label="Breadcrumb"] a').getAttribute('href') };
        })()`)
        assert.equal(result.overflow, false, `${theme} ${width} ${id}`)
        assert.equal(result.stacked, width === 320)
        assert.equal(result.imageFailures, 0)
        assert.equal(result.breadcrumb, '/')
        results[`${theme}-${width}-${id}`] = result
        const screenshot = await command('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
        })
        await writeFile(
          `${directory}/${theme}-${width}-${id}.png`,
          Buffer.from(screenshot.data, 'base64'),
        )
      }
    }
  }
  // Focus the breadcrumb via keyboard, then activate it with Enter.
  await evaluate('document.querySelector(\'nav[aria-label="Breadcrumb"] a\').focus()')
  assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Archive')
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  })
  await command('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  })
  await evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const check = () => location.pathname === '/' && document.querySelector('#archive-search') ? resolve() :
      Date.now() > deadline ? reject(new Error('Breadcrumb did not return to Archive')) : requestAnimationFrame(check);
    check();
  })`)
  const evidence = {
    browser: (await browser.version()).product,
    origin,
    keyboardBreadcrumb: true,
    results,
  }
  await writeFile(`${directory}/results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
