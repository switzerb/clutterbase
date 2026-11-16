// Start the app on port 5290, then run: vp node scripts/verify-discovery.mjs
// The impossible query also reproduces the no-results state: /?q=definitely-not-in-the-demo.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5290'
const browser = await openBrowser()
try {
  const { command, evaluate } = browser
  const wait = (condition) =>
    evaluate(`new Promise((resolve, reject) => {
    const deadline = Date.now() + 10000;
    const check = () => {
      if (${condition}) return resolve(true);
      if (Date.now() > deadline) return reject(new Error('Timed out: ${condition.replaceAll("'", "\\'")}'));
      requestAnimationFrame(check);
    }; check();
  })`)
  await command('Page.navigate', { url: `${origin}/?other=kept` })
  await wait("document.querySelector('#archive-search')")
  await evaluate("document.querySelector('#archive-search').focus()")
  for (const text of ['M', 'a', 'r', 'a']) {
    await command('Input.insertText', { text })
  }
  await wait("new URL(location.href).searchParams.get('q') === 'Mara'")
  assert.equal(await evaluate('document.activeElement.id'), 'archive-search')
  assert.equal(await evaluate("document.querySelector('#archive-search').value"), 'Mara')
  await evaluate(`(() => {
    const select = document.querySelector('#archive-type');
    select.value = 'pdf'; select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`)
  await wait("new URL(location.href).searchParams.get('type') === 'pdf'")
  assert.equal(
    await evaluate("document.querySelector('[role=status]').textContent.trim()"),
    '1 result',
  )
  await evaluate('history.back()')
  await wait("!new URL(location.href).searchParams.has('type')")
  assert.equal(await evaluate("document.querySelector('#archive-type').value"), 'all')
  await evaluate('history.forward()')
  await wait("new URL(location.href).searchParams.get('type') === 'pdf'")
  await evaluate(`(() => {
    const input = document.querySelector('#archive-search');
    input.value = 'definitely-not-in-the-demo'; input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await wait("document.body.textContent.includes('No results')")
  await evaluate(
    "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear criteria').click()",
  )
  await wait("document.querySelector('[role=status]').textContent.trim() === '5 results'")
  assert.equal(await evaluate('location.search'), '?other=kept')
  await command('Page.navigate', { url: `${origin}/?q=pdf&type=pdf&sort=oldest` })
  await wait(
    "location.search.includes('sort=oldest') && document.querySelector('#archive-search')?.value === 'pdf'",
  )
  assert.equal(await evaluate("document.querySelector('#archive-sort').value"), 'oldest')
  assert.equal(
    await evaluate("document.querySelector('[role=status]').textContent.trim()"),
    '2 results',
  )
  const evidence = {
    browser: (await browser.version()).product,
    origin,
    typingFocus: true,
    backForward: true,
    noResultsRecovery: true,
    directUrl: true,
  }
  await mkdir('.working/verification/discovery', { recursive: true })
  await writeFile(
    '.working/verification/discovery/results.json',
    JSON.stringify(evidence, null, 2) + '\n',
  )
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
