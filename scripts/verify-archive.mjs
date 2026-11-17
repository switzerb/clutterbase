// Start the app, then run: PREVIEW_URL=http://127.0.0.1:5290 vp node scripts/verify-archive.mjs
// Captures synthetic fixture examples in both themes under ignored .working/verification/archive.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const browser = await openBrowser()
try {
  const { command, evaluate } = browser
  const results = {}
  await mkdir('.working/verification/archive', { recursive: true })
  await command('Page.navigate', { url: origin })
  // Navigation can replace the execution context before the app mounts.
  let loaded = false
  const deadline = Date.now() + 10000
  while (!loaded && Date.now() < deadline) {
    try {
      loaded = await evaluate("document.querySelectorAll('main li').length === 5")
    } catch {
      // Retry while Chrome swaps documents.
    }
  }
  assert.equal(loaded, true, 'Archive did not load')
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
      const result = await evaluate(`new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Archive did not load')), 10000);
        const check = () => {
          const cards = [...document.querySelectorAll('main li')];
          if (cards.length !== 5 || [...document.images].some(image => !image.complete)) return requestAnimationFrame(check);
          clearTimeout(timeout);
          resolve({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
            cards: cards.length, imageFailures: [...document.querySelectorAll('main img')].filter(i => !i.naturalWidth).length,
            pdfFit: getComputedStyle(cards[1].querySelector('img')).objectFit,
            linksVisible: cards.every(card => card.querySelector('a').getBoundingClientRect().width > 0) });
        }; check();
      })`)
      assert.equal(result.overflow, false)
      assert.equal(result.imageFailures, 0)
      assert.equal(result.pdfFit, 'contain')
      assert.equal(result.linksVisible, true)
      results[`${theme}-${width}`] = result
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        `.working/verification/archive/${theme}-${width}.png`,
        Buffer.from(screenshot.data, 'base64'),
      )
    }
  }
  const evidence = { browser: (await browser.version()).product, origin, results }
  await writeFile(
    '.working/verification/archive/results.json',
    JSON.stringify(evidence, null, 2) + '\n',
  )
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
