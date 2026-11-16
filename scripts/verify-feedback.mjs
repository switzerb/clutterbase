// Start `vp dev --host 127.0.0.1 --port 5174 --strictPort`, then run
// `vp node scripts/verify-feedback.mjs`. Results stay under .working/verification.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.FEEDBACK_URL ?? 'http://127.0.0.1:5174'
const browser = await openBrowser()
try {
  const { command, evaluate } = browser
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await command('Page.navigate', { url: `${origin}/scripts/fixtures/feedback.html` })
  await evaluate(`new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => document.querySelector('#retry') ? resolve(true) :
      Date.now() - start > 10000 ? reject(Error('Fixture did not load')) : requestAnimationFrame(check);
    check();
  })`)
  const evidence = { browser: (await browser.version()).product, viewport: '1366x1000', themes: {} }
  await mkdir('.working/verification/feedback', { recursive: true })

  // Tab from the preceding link, then use a real keyboard event on the retry button.
  await evaluate("document.querySelector('a').focus()")
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {
      type,
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
    })
  }
  assert.equal(await evaluate('document.activeElement.id'), 'retry')
  for (const type of ['keyDown', 'keyUp']) {
    await command('Input.dispatchKeyEvent', {
      type,
      key: 'Enter',
      code: 'Enter',
      windowsVirtualKeyCode: 13,
      ...(type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}),
    })
  }
  await evaluate('new Promise(resolve => requestAnimationFrame(resolve))')
  assert.match(await evaluate("document.querySelector('#error').textContent"), /Retry count: 1/)
  assert.match(
    await evaluate("document.querySelector('#demo-save').textContent"),
    /reset on reload/,
  )
  assert.match(
    await evaluate("document.querySelector('#demo-save').textContent"),
    /not saved to an archive/,
  )

  for (const theme of ['light', 'dark']) {
    const setMedia = (motion) =>
      command('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-color-scheme', value: theme },
          { name: 'prefers-reduced-motion', value: motion },
        ],
      })
    await setMedia('no-preference')
    const result = await evaluate(`(() => {
      const token = name => {
        const e = document.createElement('i');
        e.style.color = 'var(--color-' + name + ')';
        document.body.append(e);
        const color = getComputedStyle(e).color;
        e.remove();
        return color;
      };
      const contrast = (fg, bg) => {
        const luminance = color => {
          const channels = color.match(/[\\d.]+/g).slice(0, 3).map(Number).map(v => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        };
        const a = luminance(fg), b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const tones = [...document.querySelectorAll('[data-tone]')].map(e => {
        const style = getComputedStyle(e);
        return { tone: e.dataset.tone, text: e.textContent.trim(), color: style.color,
          background: style.backgroundColor, fontSize: style.fontSize,
          contrast: contrast(style.color, style.backgroundColor) };
      });
      return {
        errorBorder: getComputedStyle(document.querySelector('#error')).borderTopColor,
        dangerToken: token('danger'),
        saveBorder: getComputedStyle(document.querySelector('#demo-save')).borderTopColor,
        successToken: token('success'),
        animation: getComputedStyle(document.querySelector('#loading [aria-hidden]')).animationName,
        tones
      };
    })()`)
    assert.equal(result.errorBorder, result.dangerToken)
    assert.equal(result.saveBorder, result.successToken)
    assert.notEqual(result.animation, 'none')
    assert.equal(result.tones.length, 5)
    for (const tone of result.tones) {
      assert.ok(tone.text.length > 0, `${theme} ${tone.tone} needs text`)
      assert.ok(parseFloat(tone.fontSize) >= 18, `${theme} ${tone.tone} font size`)
      assert.ok(tone.contrast >= 4.5, `${theme} ${tone.tone} contrast ${tone.contrast}`)
    }
    await setMedia('reduce')
    result.reducedAnimation = await evaluate(
      "getComputedStyle(document.querySelector('#loading [aria-hidden]')).animationName",
    )
    assert.equal(result.reducedAnimation, 'none')
    assert.match(
      await evaluate("document.querySelector('#demo-save').textContent"),
      /Changes applied/,
    )
    const screenshot = await command('Page.captureScreenshot')
    await writeFile(
      `.working/verification/feedback/${theme}.png`,
      Buffer.from(screenshot.data, 'base64'),
    )
    evidence.themes[theme] = result
  }
  evidence.checks = [
    'Keyboard Tab and Enter activate Retry',
    'Demo-save feedback remains visible after retry',
  ]
  await writeFile(
    '.working/verification/feedback/verification.json',
    `${JSON.stringify(evidence, null, 2)}\n`,
  )
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await browser.close()
}
