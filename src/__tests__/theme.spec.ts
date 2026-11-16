// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vite-plus/test'

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8')
const colors = Object.fromEntries(
  [...css.matchAll(/--color-([\w-]+): light-dark\((#[\da-f]{6}), (#[\da-f]{6})\);/g)].map(
    ([, name, light, dark]) => [name, [light!, dark!]],
  ),
)

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = Number.parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0]! + 0.05) / (values[1]! + 0.05)
}

describe('semantic theme contract', () => {
  it('replaces the starter favicon with the Clutterbase SVG', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    const icon = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8')
    expect(html).toContain('href="/favicon.svg"')
    expect(html).not.toContain('favicon.ico')
    expect(icon).toContain('viewBox="0 0 32 32"')
    expect(icon).toContain('#365e49')
  })

  it('uses native adaptive appearance, readable typography, and a 48px control baseline', () => {
    expect(css).toContain('color-scheme: light dark')
    expect(colors.canvas).toEqual(['#ffffff', '#171c19'])
    expect(css).toContain('--text-base: 1.125rem')
    expect(css).toContain('--spacing-control: 3rem')
    expect(css).not.toMatch(/(?:filter|mix-blend-mode)\s*:/)
    expect(Object.keys(colors)).toEqual(
      expect.arrayContaining([
        'canvas',
        'surface',
        'surface-raised',
        'foreground',
        'muted',
        'border',
        'accent',
        'accent-hover',
        'on-accent',
        'focus',
        'success',
        'warning',
        'danger',
        'info',
      ]),
    )
  })

  for (const [theme, index] of [
    ['light', 0],
    ['dark', 1],
  ] as const) {
    for (const background of ['canvas', 'surface', 'surface-raised']) {
      for (const foreground of [
        'foreground',
        'muted',
        'accent',
        'success',
        'warning',
        'danger',
        'info',
      ]) {
        it(`${theme}: ${foreground} text on ${background} meets 4.5:1`, () => {
          expect(
            contrast(colors[foreground]![index]!, colors[background]![index]!),
          ).toBeGreaterThanOrEqual(4.5)
        })
      }
      for (const foreground of ['border', 'focus']) {
        it(`${theme}: ${foreground} against ${background} meets 3:1`, () => {
          expect(
            contrast(colors[foreground]![index]!, colors[background]![index]!),
          ).toBeGreaterThanOrEqual(3)
        })
      }
    }
    for (const background of ['accent', 'accent-hover']) {
      it(`${theme}: action text on ${background} meets 4.5:1`, () => {
        expect(
          contrast(colors['on-accent']![index]!, colors[background]![index]!),
        ).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
