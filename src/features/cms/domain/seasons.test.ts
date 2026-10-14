import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SEASON_CSS_KEYS,
  seasonColors,
  seasonCssText,
  seasonCssVariables,
  seasonSwatches,
  THEME_SEASON_DEFINITIONS,
  THEME_SEASONS,
  type SeasonMode,
  type ThemeSeason,
} from './seasons'

/**
 * The stylesheet is the other half of the season contract: globals.css must declare exactly the
 * default season. Read from disk (relative to the vitest root) rather than imported, because
 * vitest runs with `css: false` and stubs every CSS module — `?raw` included — as an empty
 * string.
 */
const css = readFileSync(path.join(process.cwd(), 'src/styles/globals.css'), 'utf8')

/** Relative luminance, WCAG 2.1 (sRGB). */
function luminance(hex: string): number {
  const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** Custom properties declared in the first `selector { ... }` block of globals.css. */
function declaredVariables(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `${selector} block present in globals.css`).toBeGreaterThan(-1)
  const end = css.indexOf('\n}', start)
  const out: Record<string, string> = {}
  for (const match of css.slice(start, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    out[match[1] ?? ''] = (match[2] ?? '').trim()
  }
  return out
}

describe('contrast helper', () => {
  it('matches the known WCAG anchors', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrast('#ffffff', '#767676')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('season palettes', () => {
  const modes: SeasonMode[] = ['light', 'dark']

  it.each(THEME_SEASONS)('%s declares every season token in both modes', (season) => {
    for (const mode of modes) {
      const tokens = seasonCssVariables(season, mode)
      expect(Object.keys(tokens).sort()).toEqual([...SEASON_CSS_KEYS].sort())
      for (const value of Object.values(tokens)) expect(value).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('the default season is exactly what globals.css declares', () => {
    const root = declaredVariables(':root')
    const dark = declaredVariables('.dark')
    for (const key of SEASON_CSS_KEYS) {
      expect(root[key], `:root ${key}`).toBe(THEME_SEASON_DEFINITIONS.default.light[key])
      // The `.dark` block only overrides what changes; the rest stays as declared on :root.
      expect(dark[key] ?? root[key], `.dark ${key}`).toBe(
        THEME_SEASON_DEFINITIONS.default.dark[key],
      )
    }
  })

  it('the editable seven mirror the season light tokens', () => {
    for (const season of THEME_SEASONS) {
      const tokens = THEME_SEASON_DEFINITIONS[season].light
      expect(seasonColors(season)).toEqual({
        primary: tokens['--primary'],
        primaryForeground: tokens['--primary-foreground'],
        background: tokens['--background'],
        foreground: tokens['--foreground'],
        muted: tokens['--muted'],
        mutedForeground: tokens['--muted-foreground'],
        border: tokens['--border'],
      })
      expect(seasonSwatches(season)).toHaveLength(4)
    }
  })

  it('every text pair clears WCAG AA 4.5:1 in both modes', () => {
    const pairs: ReadonlyArray<[string, string]> = [
      ['--foreground', '--background'],
      ['--card-foreground', '--card'],
      ['--popover-foreground', '--popover'],
      ['--foreground', '--muted'],
      ['--muted-foreground', '--background'],
      ['--muted-foreground', '--card'],
      ['--muted-foreground', '--muted'],
      ['--primary-foreground', '--primary'],
      ['--secondary-foreground', '--secondary'],
      ['--accent-foreground', '--accent'],
      ['--sidebar-foreground', '--sidebar'],
      ['--sidebar-primary-foreground', '--sidebar-primary'],
      ['--sidebar-accent-foreground', '--sidebar-accent'],
    ]
    const failures: string[] = []
    for (const season of THEME_SEASONS) {
      for (const mode of modes) {
        const tokens = seasonCssVariables(season, mode)
        for (const [fg, bg] of pairs) {
          const ratio = contrast(tokens[fg] ?? '#ffffff', tokens[bg] ?? '#ffffff')
          if (ratio < 4.5) failures.push(`${season}/${mode} ${fg} on ${bg} = ${ratio.toFixed(2)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('white hero copy clears AA on every season ink', () => {
    for (const season of THEME_SEASONS) {
      for (const mode of modes) {
        const ink = seasonCssVariables(season, mode)['--brand-ink'] ?? '#000000'
        expect(contrast('#ffffff', ink)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('seasonCssText', () => {
  it('writes nothing for the default season, which the stylesheet already holds', () => {
    expect(seasonCssText('default')).toBe('')
  })

  it.each(['camo', 'christmas'] as ThemeSeason[])(
    '%s emits a :root and a .dark rule of allow-listed tokens only',
    (season) => {
      const text = seasonCssText(season)
      expect(text).toContain(':root {')
      expect(text).toContain('.dark {')
      // The .dark rule must come last so it still wins over the :root rule above it.
      expect(text.indexOf('.dark {')).toBeGreaterThan(text.indexOf(':root {'))

      const declarations = [...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
      expect(declarations).toHaveLength(SEASON_CSS_KEYS.length * 2)
      for (const [, key = '', value = ''] of declarations) {
        expect(SEASON_CSS_KEYS).toContain(key)
        expect(value).toMatch(/^#[0-9a-f]{6}$/)
      }
      expect(seasonCssVariables(season, 'dark')['--primary']).toBe(
        text.slice(text.indexOf('.dark {')).match(/--primary:\s*([^;]+);/)?.[1],
      )
    },
  )
})
