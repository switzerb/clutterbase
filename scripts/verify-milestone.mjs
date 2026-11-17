// Run against the built preview: PREVIEW_URL=http://127.0.0.1:5390 vp node scripts/verify-milestone.mjs
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { openBrowser } from './lib/browser.mjs'

const origin = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5390'
const dir = '.working/verification/acceptance'
await mkdir(dir, { recursive: true })
const browser = await openBrowser()
try {
  const { command, send, evaluate } = browser
  const settings = await send('Target.createTarget', { url: 'chrome://settings/' })
  const { sessionId } = await send('Target.attachToTarget', {
    targetId: settings.targetId,
    flatten: true,
  })
  const setZoom = async (value) => {
    const result = await send(
      'Runtime.evaluate',
      { expression: `chrome.settingsPrivate.setDefaultZoom(${value})`, returnByValue: true },
      sessionId,
    )
    assert.equal(result.exceptionDetails, undefined)
  }
  const routes = [
    ['archive', '/', 'Archive'],
    ['photo', '/archive/garden-afternoon', ''],
    ['letter', '/archive/summer-letter', ''],
    ['sparse', '/archive/long-filename', ''],
    ['inbox', '/inbox', 'Inbox'],
    ['family', '/family', 'Family'],
    ['upload', '/upload', 'Upload files'],
  ]
  const results = {}
  const contrast = {}
  for (const theme of ['light', 'dark']) {
    await command('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    })
    for (const [layout, width, zoom] of [
      ['desktop', 1366, 1],
      ['zoom200', 1366, 2],
      ['narrow', 320, 1],
    ]) {
      await setZoom(zoom)
      await command('Emulation.setDeviceMetricsOverride', {
        width,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false,
      })
      for (const [name, path, heading] of routes) {
        await command('Page.navigate', { url: origin + path })
        let ready = false
        const deadline = Date.now() + 10000
        while (!ready && Date.now() < deadline) {
          try {
            ready = await evaluate(
              `location.pathname === ${JSON.stringify(path)} && !!document.querySelector('main h1') && [...document.images].every(i => i.complete)`,
            )
          } catch {
            // Navigation replaces the execution context.
          }
        }
        assert.ok(ready, `${path} did not load`)
        const state = await evaluate(`(() => {
          const controls = [...document.querySelectorAll('a, button, input, select, textarea')]
            .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
          return {
            width: innerWidth, ratio: devicePixelRatio, title: document.querySelector('main h1').textContent.trim(),
            overflow: document.documentElement.scrollWidth > innerWidth,
            clipped: controls.filter(e => {
              const r = e.getBoundingClientRect();
              return r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > innerWidth + 1;
            }).map(e => e.outerHTML.slice(0, 200)),
            imagesFailed: [...document.images].filter(i => !i.naturalWidth).map(i => i.src)
          };
        })()`)
        assert.equal(state.width, zoom === 2 ? 683 : width, `${theme} ${layout} ${path}`)
        assert.equal(state.ratio, zoom, `${theme} ${layout} ${path}`)
        assert.equal(state.overflow, false, `${theme} ${layout} ${path}`)
        assert.deepEqual(state.clipped, [], `${theme} ${layout} ${path}`)
        assert.deepEqual(state.imagesFailed, [], `${theme} ${layout} ${path}`)
        if (heading) assert.equal(state.title, heading)
        if (layout === 'desktop' && name === 'archive') {
          const pairs = await evaluate(`(() => {
            const names = ['canvas', 'surface', 'surface-raised', 'foreground', 'muted',
              'accent', 'accent-hover', 'on-accent', 'success', 'warning', 'danger', 'info', 'border', 'focus'];
            const colors = {};
            const sample = document.createElement('div');
            document.body.append(sample);
            for (const name of names) {
              sample.style.color = 'var(--color-' + name + ')';
              colors[name] = getComputedStyle(sample).color.match(/[\\d.]+/g).slice(0, 3).map(Number);
            }
            sample.remove();
            const lum = c => c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 })
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
            const ratio = (a, b) => { const x = [lum(colors[a]), lum(colors[b])].sort((a,b) => b-a); return (x[0]+.05)/(x[1]+.05); };
            const pairs = [];
            for (const bg of ['canvas', 'surface', 'surface-raised']) {
              for (const fg of ['foreground', 'muted', 'accent', 'success', 'warning', 'danger', 'info'])
                pairs.push({ fg, bg, ratio: ratio(fg,bg), minimum: 4.5 });
              for (const fg of ['border', 'focus'])
                pairs.push({ fg, bg, ratio: ratio(fg,bg), minimum: 3 });
            }
            for (const bg of ['accent', 'accent-hover'])
              pairs.push({ fg: 'on-accent', bg, ratio: ratio('on-accent',bg), minimum: 4.5 });
            return pairs;
          })()`)
          assert.deepEqual(
            pairs.filter((pair) => pair.ratio < pair.minimum),
            [],
            theme,
          )
          contrast[theme] = pairs
        }
        const key = `${theme}-${layout}-${name}`
        results[key] = state
        const metrics = await command('Page.getLayoutMetrics')
        if (zoom === 2) {
          assert.equal(metrics.cssLayoutViewport.clientWidth, 683)
          assert.equal(metrics.layoutViewport.clientWidth, 1366)
          assert.equal(metrics.visualViewport.zoom, 2)
          assert.equal(metrics.contentSize.width, metrics.cssContentSize.width * zoom)
          assert.equal(metrics.contentSize.height, metrics.cssContentSize.height * zoom)
        }
        const image = await command('Page.captureScreenshot', {
          captureBeyondViewport: true,
          ...(zoom === 2
            ? {
                clip: {
                  x: 0,
                  y: 0,
                  width: metrics.cssContentSize.width * zoom,
                  height: metrics.cssContentSize.height * zoom,
                  scale: 1,
                },
              }
            : {}),
        })
        if (zoom === 2) state.captureMetrics = metrics
        const png = Buffer.from(image.data, 'base64')
        if (zoom === 2) {
          assert.equal(png.readUInt32BE(16), metrics.contentSize.width)
          assert.equal(png.readUInt32BE(20), metrics.contentSize.height)
        }
        await writeFile(`${dir}/${key}.png`, png)
      }
    }
    await command('Page.navigate', { url: origin })
    const wait = async (expression) => {
      const deadline = Date.now() + 10000
      while (Date.now() < deadline) {
        try {
          if (await evaluate(expression)) return
        } catch {
          // A navigation may replace the execution context.
        }
      }
      throw new Error(`Timed out: ${expression}`)
    }
    await wait("location.pathname === '/' && !!document.querySelector('[data-archive-card]')")
    await evaluate("document.querySelector('[data-archive-card]').click()")
    await wait(
      "location.pathname.startsWith('/archive/') && !!document.querySelector('nav[aria-label=Breadcrumb] a')",
    )
    await evaluate("document.querySelector('nav[aria-label=Breadcrumb] a').click()")
    await wait("location.pathname === '/' && !!document.querySelector('[data-archive-card]')")
    for (const path of ['/inbox', '/family', '/upload']) {
      await evaluate(`document.querySelector('nav[aria-label=Primary] a[href="${path}"]').click()`)
      await wait(
        `location.pathname === '${path}' && document.activeElement === document.querySelector('main h1')`,
      )
    }
  }
  for (const [query, text] of [
    ['?demo=loading', 'Loading archive'],
    ['?demo=empty', 'The archive is empty'],
    ['?demo=error', 'Archive unavailable'],
    ['?q=definitely-not-in-the-demo', 'No results'],
  ]) {
    await command('Page.navigate', { url: origin + '/' + query })
    const deadline = Date.now() + 10000
    let ready = false
    while (!ready && Date.now() < deadline) {
      try {
        ready = await evaluate(
          `location.search === ${JSON.stringify(query)} && document.body.textContent.includes(${JSON.stringify(text)})`,
        )
      } catch {
        // Navigation may replace the execution context.
      }
    }
    assert.ok(ready, `${query}: ${text}`)
  }
  await writeFile(
    `${dir}/matrix.json`,
    JSON.stringify(
      { browser: (await browser.version()).product, origin, contrast, results },
      null,
      2,
    ) + '\n',
  )
  console.log(`Passed ${Object.keys(results).length} layout checks`)
} finally {
  await browser.close()
}
