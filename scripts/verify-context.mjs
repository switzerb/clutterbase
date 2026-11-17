// Start `vp dev --port 5290`, then run `vp node scripts/verify-context.mjs`.
// Session-only context; reload/direct item URLs deliberately start without it.
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
      if (Date.now() > deadline) return reject(new Error(${JSON.stringify(`Timed out: ${condition}`)}));
      requestAnimationFrame(check);
    }; check();
  })`)
  await command('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const url = '/?q=pdf&type=pdf&sort=oldest'
  await command('Page.navigate', { url: origin + url })
  await wait("document.querySelectorAll('[data-archive-card]').length === 2")
  const order = await evaluate(
    "[...document.querySelectorAll('[data-archive-card]')].map(a => a.dataset.archiveCard)",
  )
  const id = order[1]
  await evaluate(
    `document.querySelector('[data-archive-card="${id}"]').scrollIntoView({block:'center'})`,
  )
  const y = await evaluate('scrollY')
  assert.ok(y > 0)
  await evaluate(
    `document.querySelector('[data-archive-card="${id}"]').focus({preventScroll:true})`,
  )
  assert.equal(await evaluate('document.activeElement.dataset.archiveCard'), id)
  assert.equal(await evaluate('scrollY'), y)
  for (const type of ['keyDown', 'keyUp'])
    await command('Input.dispatchKeyEvent', {
      type,
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
    })
  await wait(
    `location.pathname === '/archive/${id}' && document.querySelector('nav[aria-label=Breadcrumb] a')`,
  )
  assert.equal(
    await evaluate("document.querySelector('nav[aria-label=Breadcrumb] a').getAttribute('href')"),
    url,
  )
  await evaluate('history.back()')
  await wait(`location.pathname === '/' && document.activeElement?.dataset.archiveCard === '${id}'`)
  assert.equal(await evaluate('location.search'), url.slice(1))
  assert.equal(await evaluate('scrollY'), y)
  assert.deepEqual(
    await evaluate(
      "[...document.querySelectorAll('[data-archive-card]')].map(a => a.dataset.archiveCard)",
    ),
    order,
  )
  await evaluate('history.forward()')
  await wait(
    `location.pathname === '/archive/${id}' && document.querySelector('nav[aria-label=Breadcrumb] a')`,
  )
  await evaluate("document.querySelector('nav[aria-label=Breadcrumb] a').click()")
  await wait(`location.pathname === '/' && document.activeElement?.dataset.archiveCard === '${id}'`)
  assert.equal(await evaluate('scrollY'), y)
  await evaluate(`document.querySelector('[data-archive-card="${id}"]').click()`)
  await wait(
    `location.pathname === '/archive/${id}' && document.querySelector('nav[aria-label=Breadcrumb] a')`,
  )
  await evaluate('document.querySelector(\'nav[aria-label=Primary] a[href="/"]\').click()')
  await wait(
    "location.pathname === '/' && location.search === '' && document.querySelector('main h1') === document.activeElement",
  )
  assert.notEqual(await evaluate('document.activeElement.dataset.archiveCard'), id)
  await evaluate('history.back()')
  await wait(
    `location.pathname === '/archive/${id}' && document.querySelector('nav[aria-label=Breadcrumb] a')`,
  )
  assert.equal(
    await evaluate("document.querySelector('nav[aria-label=Breadcrumb] a').getAttribute('href')"),
    url,
  )
  await evaluate('document.querySelector(\'nav[aria-label=Primary] a[href="/family"]\').click()')
  await wait("location.pathname === '/family'")
  // A different entry to the same item from elsewhere must not reuse the old context.
  await evaluate(`document.querySelector('main a[href="/archive/${id}"]')?.click()`)
  // Family's examples may not reference this particular PDF; use an existing item link.
  if (await evaluate("location.pathname === '/family'")) {
    await evaluate('document.querySelector(\'main a[href^="/archive/"]\').click()')
  }
  await wait(
    "location.pathname.startsWith('/archive/') && document.querySelector('nav[aria-label=Breadcrumb] a')",
  )
  assert.equal(
    await evaluate("document.querySelector('nav[aria-label=Breadcrumb] a').getAttribute('href')"),
    '/',
  )
  await command('Page.navigate', { url: origin + '/archive/garden-afternoon' })
  await wait(
    "location.pathname === '/archive/garden-afternoon' && document.querySelector('nav[aria-label=Breadcrumb] a')",
  )
  assert.equal(
    await evaluate("document.querySelector('nav[aria-label=Breadcrumb] a').getAttribute('href')"),
    '/',
  )
  const evidence = {
    browser: (await browser.version()).product,
    origin,
    viewport: '320x768',
    url,
    order,
    item: id,
    scrollY: y,
    checks: [
      'keyboard Enter on originating card',
      'native Back',
      'native Forward',
      'breadcrumb',
      'repeat visit',
      'mismatched collection URL',
      'focus without scroll jump',
      'unrelated item entry',
      'direct visit',
    ],
  }
  await mkdir('.working/verification/context', { recursive: true })
  await writeFile(
    '.working/verification/context/results.json',
    JSON.stringify(evidence, null, 2) + '\n',
  )
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
