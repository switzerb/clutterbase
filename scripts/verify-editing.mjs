// Start the app on port 5290, then run: vp node scripts/verify-editing.mjs
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const browser = await openBrowser()
const { command, evaluate } = browser
const dir = '.working/verification/editing'
const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const key = async (name, code, n) => {
  for (const type of ['keyDown', 'keyUp'])
    await command('Input.dispatchKeyEvent', {
      type,
      key: name,
      code,
      windowsVirtualKeyCode: n,
      ...(type === 'keyDown' && name === 'Enter' ? { text: '\r' } : {}),
    })
}
const wait = async (expression) => {
  const until = Date.now() + 10000
  while (Date.now() < until) {
    try {
      if (await evaluate(expression)) return
    } catch {
      // The execution context can be replaced during navigation.
    }
  }
  throw new Error(`Timed out: ${expression}`)
}
try {
  await mkdir(dir, { recursive: true })
  const results = {}
  for (const theme of ['light', 'dark']) {
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    })
    for (const width of [320, 1366]) {
      await command('Emulation.setDeviceMetricsOverride', {
        width,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await command('Page.navigate', { url: 'about:blank' })
      await wait("location.href === 'about:blank'")
      await command('Page.navigate', { url: `${origin}/archive/summer-letter` })
      await wait(
        "location.pathname === '/archive/summer-letter' && !!document.querySelector('#edit-details')",
      )
      await evaluate("document.querySelector('#edit-details').focus()")
      await key('Enter', 'Enter', 13)
      await wait("!!document.querySelector('#edit-title')")
      assert.equal(await evaluate('document.activeElement.id'), 'edit-title')
      await command('Input.insertText', { text: 'X'.repeat(210) })
      await key('Tab', 'Tab', 9)
      assert.equal(await evaluate('document.activeElement.id'), 'edit-people')
      await command('Input.insertText', { text: 'Longname'.repeat(30) })
      await key('Tab', 'Tab', 9)
      await command('Input.insertText', { text: 'uncertain'.repeat(15) })
      await key('Tab', 'Tab', 9)
      await command('Input.insertText', { text: 'unbroken'.repeat(240) })
      await key('Tab', 'Tab', 9)
      assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'Save changes')
      await key('Enter', 'Enter', 13)
      await wait("!!document.querySelector('#edit-title-error')")
      assert.equal(await evaluate('document.activeElement.id'), 'edit-title')
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false)
      const screenshot = await command('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
      })
      await writeFile(
        `${dir}/${theme}-${width}-validation.png`,
        Buffer.from(screenshot.data, 'base64'),
      )
      await evaluate(
        "document.querySelector('#edit-title').value = 'Keyboard saved'; document.querySelector('#edit-title').dispatchEvent(new Event('input', { bubbles: true }))",
      )
      await evaluate("document.querySelector('button[type=submit]').focus()")
      await key('Enter', 'Enter', 13)
      await wait("!!document.querySelector('#edit-details')")
      assert.equal(await evaluate('document.activeElement.id'), 'edit-details')
      assert.equal(
        await evaluate('document.querySelector("h1").textContent.trim()'),
        'Keyboard saved',
      )
      assert.equal(await evaluate('document.title'), 'Keyboard saved · Clutterbase')
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false)
      assert.equal(await evaluate('document.body.textContent.includes("reset on reload")'), true)
      await key('Enter', 'Enter', 13)
      await wait("!!document.querySelector('#edit-title')")
      await command('Input.insertText', { text: 'discard' })
      await evaluate(
        "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Cancel').focus()",
      )
      await key('Enter', 'Enter', 13)
      await wait("!!document.querySelector('#edit-details')")
      assert.equal(await evaluate('document.activeElement.id'), 'edit-details')
      assert.equal(
        await evaluate('document.querySelector("h1").textContent.trim()'),
        'Keyboard saved',
      )
      await command('Page.reload')
      await wait("document.querySelector('h1')?.textContent.trim() === 'A letter from summer camp'")
      assert.equal(
        await evaluate('document.body.textContent.includes("Demo changes saved")'),
        false,
      )
      results[`${theme}-${width}`] =
        'keyboard open/save/cancel, validation, no overflow, reload reset passed'
    }
  }
  const report = { browser: (await browser.version()).product, origin, results }
  await writeFile(`${dir}/results.json`, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
