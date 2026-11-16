// Start `vp dev --host 127.0.0.1 --port 5174 --strictPort` first.
// Screenshots and results are local artifacts under .working/verification/controls/.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const origin = process.env.CONTROLS_URL ?? 'http://127.0.0.1:5174'
const executable =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profile = await mkdtemp(join(tmpdir(), 'clutterbase-controls-'))
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
    chrome.on('exit', (code) => reject(new Error(`Chrome exited: ${code}`)))
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
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const requestId = ++id
      pending.set(requestId, { resolve, reject })
      socket.send(JSON.stringify({ id: requestId, method, params, sessionId }))
    })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const command = (method, params) => send(method, params, sessionId)
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const key = async (name, code, virtual, modifiers = 0) => {
    for (const type of ['keyDown', 'keyUp']) {
      const text = name === ' ' ? ' ' : name === 'Enter' ? '\r' : undefined
      await command('Input.dispatchKeyEvent', {
        type,
        key: name,
        code,
        windowsVirtualKeyCode: virtual,
        modifiers,
        ...(type === 'keyDown' && text ? { text, unmodifiedText: text } : {}),
      })
    }
  }
  const tab = (shift = false) => key('Tab', 'Tab', 9, shift ? 8 : 0)
  const active = () =>
    evaluate('document.activeElement.id || document.activeElement.textContent.trim()')
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await command('Page.navigate', { url: `${origin}/scripts/fixtures/controls.html` })
  await evaluate(`new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => document.querySelector('#sort') ? resolve(true) :
      Date.now() - start > 10000 ? reject(Error('Fixture did not load')) : requestAnimationFrame(check);
    check();
  })`)
  const evidence = {
    browser: (await send('Browser.getVersion')).product,
    viewport: '1366x1000',
    themes: {},
    checks: [],
  }
  await mkdir('.working/verification/controls', { recursive: true })

  // Native keyboard interaction, not synthetic change or click events.
  await evaluate("document.querySelector('#sort').focus()")
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'o',
    code: 'KeyO',
    windowsVirtualKeyCode: 79,
    text: 'o',
    unmodifiedText: 'o',
  })
  await command('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'o',
    code: 'KeyO',
    windowsVirtualKeyCode: 79,
  })
  assert.equal(await evaluate("document.querySelector('#selection').textContent"), 'old')
  await evaluate("document.querySelector('#action').focus()")
  await key('Enter', 'Enter', 13)
  assert.equal(await evaluate("document.querySelector('#clicks').textContent"), '1')
  await evaluate(
    "document.querySelector('#disabled-action').click(); document.querySelector('[aria-disabled=true]').click()",
  )
  assert.equal(await evaluate("document.querySelector('#clicks').textContent"), '1')
  assert.equal(
    await evaluate("document.querySelector('[aria-disabled=true]').hasAttribute('href')"),
    false,
  )
  await tab()
  assert.equal(await active(), 'Archive')

  await evaluate(
    "[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Open details').focus()",
  )
  await key('Enter', 'Enter', 13)
  assert.equal(await active(), 'dialog-first')
  await tab()
  assert.equal(await active(), 'dialog-second')
  await tab()
  assert.equal(await active(), 'Close')
  await tab()
  assert.equal(await active(), 'dialog-first')
  await tab(true)
  assert.equal(await active(), 'Close')
  await key('Escape', 'Escape', 27)
  assert.equal(await evaluate("document.querySelector('[role=dialog]') === null"), true)
  assert.equal(await active(), 'Open details')
  evidence.checks.push(
    'Native select typeahead updates value',
    'Enter activates button; disabled button and link do not activate',
    'Dialog Tab and Shift+Tab wrap through slot controls; Escape returns focus',
  )

  for (const theme of ['light', 'dark']) {
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 })
    await command('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: theme },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    })
    await evaluate("document.querySelector('#normal').focus()")
    // Keyboard focus establishes :focus-visible, rather than programmatic pointer focus.
    await tab(true)
    await tab()
    const result = await evaluate(`(() => {
      const normal = getComputedStyle(document.querySelector('#normal'));
      const invalid = getComputedStyle(document.querySelector('#invalid'));
      const disabled = getComputedStyle(document.querySelector('#disabled-field'));
      const token = name => { const e = document.createElement('i'); e.style.color = 'var(--color-' + name + ')'; document.body.append(e); const color = getComputedStyle(e).color; e.remove(); return color; };
      return { normalBorder: normal.borderTopColor, errorBorder: invalid.borderTopColor,
        borderToken: token('border'), dangerToken: token('danger'),
        disabledBorder: disabled.borderTopColor, disabledStyle: disabled.borderTopStyle,
        selectBorder: getComputedStyle(document.querySelector('#sort')).borderTopColor,
        invalidSelectBorder: getComputedStyle(document.querySelector('#invalid-select')).borderTopColor,
        disabledSelectBorder: getComputedStyle(document.querySelector('#disabled-select')).borderTopColor,
        focusStyle: normal.outlineStyle, focusWidth: normal.outlineWidth, focusColor: normal.outlineColor,
        focusToken: token('focus'), errorStyle: invalid.borderTopStyle,
        buttonHeight: document.querySelector('#action').getBoundingClientRect().height,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        animation: normal.animationName, transition: normal.transitionDuration };
    })()`)
    assert.equal(result.normalBorder, result.borderToken)
    assert.equal(result.errorBorder, result.dangerToken)
    assert.equal(result.disabledBorder, result.borderToken)
    assert.equal(result.selectBorder, result.borderToken)
    assert.equal(result.invalidSelectBorder, result.dangerToken)
    assert.equal(result.disabledSelectBorder, result.borderToken)
    assert.equal(result.disabledStyle, 'dashed')
    assert.equal(result.errorStyle, 'dashed')
    assert.equal(result.focusStyle, 'solid')
    assert.equal(result.focusWidth, '2px')
    assert.equal(result.focusColor, result.focusToken)
    assert.ok(result.buttonHeight >= 48)
    assert.equal(result.reducedMotion, true)
    assert.equal(result.animation, 'none')
    assert.equal(result.transition, '0s')
    // Hover disabled input and verify it does not acquire the enabled hover border.
    const point = await evaluate(
      "(() => { const r = document.querySelector('#disabled-field').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()",
    )
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
    assert.equal(
      await evaluate("getComputedStyle(document.querySelector('#disabled-field')).borderTopColor"),
      result.borderToken,
    )
    await evaluate("document.querySelector('#disabled-select').scrollIntoView({block:'center'})")
    const selectPoint = await evaluate(
      "(() => { const r = document.querySelector('#disabled-select').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()",
    )
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...selectPoint })
    assert.equal(
      await evaluate("getComputedStyle(document.querySelector('#disabled-select')).borderTopColor"),
      result.borderToken,
    )
    await evaluate("document.querySelector('#normal').scrollIntoView({block:'center'})")
    const normalPoint = await evaluate(
      "(() => { const r = document.querySelector('#normal').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()",
    )
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', ...normalPoint })
    result.hoverBorder = await evaluate(
      "getComputedStyle(document.querySelector('#normal')).borderTopColor",
    )
    assert.notEqual(result.hoverBorder, result.borderToken)
    await evaluate("document.querySelector('#action').scrollIntoView({block:'start'})")
    const screenshot = await command('Page.captureScreenshot')
    await writeFile(
      `.working/verification/controls/${theme}.png`,
      Buffer.from(screenshot.data, 'base64'),
    )
    evidence.themes[theme] = result
  }
  evidence.checks.push(
    'Both themes: default, error, disabled and keyboard focus computed styles',
    'Disabled field hover preserves border',
    'Reduced motion enabled; field has no animation or transition',
    'Primary button at least 48px',
  )
  await writeFile(
    '.working/verification/controls/verification.json',
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
