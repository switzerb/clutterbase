// Start the app on port 5290, then run: vp node scripts/verify-family.mjs
// Mara references summer-letter and garden-afternoon; Alex references garden-afternoon.
// Both profiles and their associations are invented, with no editing or persistence.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const directory = '.working/verification/family'
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
      await command('Page.navigate', { url: `${origin}/family` })
      let ready = false
      const deadline = Date.now() + 10000
      while (!ready && Date.now() < deadline) {
        try {
          ready = await evaluate(
            `location.pathname === '/family' && !!document.querySelector('#person-heading')`,
          )
        } catch {
          // Navigation can replace the execution context.
        }
      }
      assert.equal(ready, true, 'Family did not load')
      const assertBorders = async () => {
        const borders = await evaluate(`(() => {
          const probe = document.createElement('div');
          document.body.append(probe);
          probe.style.borderColor = 'var(--color-accent)';
          const accent = getComputedStyle(probe).borderTopColor;
          probe.style.borderColor = 'var(--color-border)';
          const normal = getComputedStyle(probe).borderTopColor;
          probe.remove();
          return {
            selected: getComputedStyle(document.querySelector('main button[aria-pressed="true"]')).borderTopColor,
            unselected: getComputedStyle(document.querySelector('main button[aria-pressed="false"]')).borderTopColor,
            accent, normal,
          };
        })()`)
        assert.notEqual(borders.accent, borders.normal)
        assert.equal(borders.selected, borders.accent)
        assert.equal(borders.unselected, borders.normal)
        return borders
      }
      const snapshot = () =>
        evaluate(`(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        heading: document.querySelector('#person-heading').textContent.trim(),
        pressed: [...document.querySelectorAll('main button')].map(b => b.getAttribute('aria-pressed')),
        links: [...document.querySelectorAll('main section a')].map(a => a.getAttribute('href')),
        boundary: document.querySelector('main').textContent.includes('not connected person records'),
      }))()`)
      const initial = await snapshot()
      assert.deepEqual(initial, {
        overflow: false,
        heading: 'Mara',
        pressed: ['true', 'false'],
        links: ['/archive/summer-letter', '/archive/garden-afternoon'],
        boundary: true,
      })
      const initialBorders = await assertBorders()
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        `${directory}/${theme}-${width}-mara.png`,
        Buffer.from(screenshot.data, 'base64'),
      )
      await evaluate(`document.querySelectorAll('main button')[1].focus()`)
      assert.equal(await evaluate(`document.activeElement.textContent.trim()`), 'Alex')
      for (const type of ['keyDown', 'keyUp']) {
        await command('Input.dispatchKeyEvent', {
          type,
          key: ' ',
          code: 'Space',
          windowsVirtualKeyCode: 32,
        })
      }
      await evaluate(
        `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
      )
      const selected = await snapshot()
      assert.deepEqual(selected, {
        overflow: false,
        heading: 'Alex',
        pressed: ['false', 'true'],
        links: ['/archive/garden-afternoon'],
        boundary: true,
      })
      const selectedBorders = await assertBorders()
      const selectedScreenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        `${directory}/${theme}-${width}-alex.png`,
        Buffer.from(selectedScreenshot.data, 'base64'),
      )
      results[`${theme}-${width}`] = {
        initial,
        selected,
        initialBorders,
        selectedBorders,
        keyboard: 'Space',
      }
    }
  }
  const evidence = { browser: (await browser.version()).product, origin, results }
  await writeFile(`${directory}/results.json`, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
