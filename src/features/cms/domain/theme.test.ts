import { describe, expect, it } from 'vitest'

import { hexColorSchema } from './common'
import { THEME_DEFAULT } from './defaults'
import {
  seasonBaselineTheme,
  seasonColors,
  THEME_CSS_KEYS,
  THEME_SEASONS,
  themeContentSchema,
  themeCssOverrides,
  themeToCssVariables,
} from './theme'

describe('themeToCssVariables', () => {
  it('writes only the allow-listed CSS custom properties', () => {
    const vars = themeToCssVariables({
      ...THEME_DEFAULT,
      colors: { ...THEME_DEFAULT.colors, primary: '#ff0000' },
      radius: 'lg',
      buttonStyle: 'pill',
      sectionSpacing: 'spacious',
    })
    for (const key of Object.keys(vars)) {
      expect(key.startsWith('--')).toBe(true)
      expect(THEME_CSS_KEYS).toContain(key)
    }
    expect(Object.keys(vars).sort()).toEqual([...THEME_CSS_KEYS].sort())
    expect(vars['--primary']).toBe('#ff0000')
    expect(vars['--ring']).toBe('#ff0000')
    expect(vars['--radius']).toBe('0.75rem')
    expect(vars['--button-radius']).toBe('9999px')
    expect(vars['--section-scale']).toBe('1.3')
  })

  it('never emits values outside the token set (no arbitrary CSS)', () => {
    const vars = themeToCssVariables(THEME_DEFAULT)
    for (const value of Object.values(vars)) {
      expect(value).not.toMatch(/[;{}]/)
    }
  })
})

describe('hex colour validation', () => {
  it('accepts 6-digit hex and rejects malformed input', () => {
    expect(hexColorSchema.safeParse('#111111').success).toBe(true)
    expect(hexColorSchema.safeParse('#AbCdEf').success).toBe(true)
    expect(hexColorSchema.safeParse('#ggg').success).toBe(false)
    expect(hexColorSchema.safeParse('#fff').success).toBe(false)
    expect(hexColorSchema.safeParse('111111').success).toBe(false)
    expect(hexColorSchema.safeParse('red').success).toBe(false)
  })

  it('rejects a theme with an invalid colour', () => {
    const result = themeContentSchema.safeParse({
      ...THEME_DEFAULT,
      colors: { ...THEME_DEFAULT.colors, border: '#ggg' },
    })
    expect(result.success).toBe(false)
  })

  it('accepts the shipped default theme', () => {
    expect(themeContentSchema.safeParse(THEME_DEFAULT).success).toBe(true)
  })
})

describe('theme season', () => {
  it('defaults to the default season when stored content predates the field', () => {
    const { season: _omitted, ...legacy } = THEME_DEFAULT
    expect('season' in legacy).toBe(false)

    const result = themeContentSchema.safeParse(legacy)
    expect(result.success).toBe(true)
    expect(result.data?.season).toBe('default')
    expect(result.data).toEqual(THEME_DEFAULT)
  })

  it('accepts every shipped season and rejects anything else', () => {
    for (const season of THEME_SEASONS) {
      expect(themeContentSchema.safeParse({ ...THEME_DEFAULT, season }).success).toBe(true)
    }
    expect(themeContentSchema.safeParse({ ...THEME_DEFAULT, season: 'easter' }).success).toBe(false)
    expect(themeContentSchema.safeParse({ ...THEME_DEFAULT, season: null }).success).toBe(false)
  })

  it('the default season baseline is the shipped default theme', () => {
    expect(seasonBaselineTheme('default')).toEqual(THEME_DEFAULT)
  })

  it('maps each season palette onto the same allow-listed variables', () => {
    for (const season of THEME_SEASONS) {
      const theme = seasonBaselineTheme(season)
      const vars = themeToCssVariables(theme)
      expect(Object.keys(vars).sort()).toEqual([...THEME_CSS_KEYS].sort())
      expect(vars['--primary']).toBe(seasonColors(season).primary)
      expect(vars['--ring']).toBe(seasonColors(season).primary)
      expect(vars['--background']).toBe(seasonColors(season).background)
      expect(vars['--border']).toBe(seasonColors(season).border)
    }
  })

  it('distinguishes the seasons: no two share a primary or a surface tint', () => {
    const primaries = THEME_SEASONS.map((s) => seasonColors(s).primary)
    const tints = THEME_SEASONS.map((s) => seasonColors(s).muted)
    expect(new Set(primaries).size).toBe(THEME_SEASONS.length)
    expect(new Set(tints).size).toBe(THEME_SEASONS.length)
  })
})

describe('themeCssOverrides', () => {
  it('writes nothing for an untouched season, so the stylesheet keeps dark mode', () => {
    for (const season of THEME_SEASONS) {
      expect(themeCssOverrides(seasonBaselineTheme(season))).toEqual({})
    }
  })

  it('writes only what the admin changed away from the season', () => {
    const edited = {
      ...seasonBaselineTheme('christmas'),
      colors: { ...seasonColors('christmas'), primary: '#ff0000' },
    }
    expect(themeCssOverrides(edited)).toEqual({ '--primary': '#ff0000', '--ring': '#ff0000' })
  })

  it('writes the shape tokens when they leave the shipped values', () => {
    expect(themeCssOverrides({ ...seasonBaselineTheme('camo'), radius: 'lg' })).toEqual({
      '--radius': '0.75rem',
    })
    expect(
      themeCssOverrides({ ...seasonBaselineTheme('camo'), sectionSpacing: 'compact' }),
    ).toEqual({ '--section-scale': '0.7' })
  })

  it('never emits a key outside the allow list', () => {
    const vars = themeCssOverrides({
      ...seasonBaselineTheme('camo'),
      colors: { ...seasonColors('camo'), background: '#101010', foreground: '#fefefe' },
      fontFamily: 'Geist',
    })
    for (const key of Object.keys(vars)) expect(THEME_CSS_KEYS).toContain(key)
    expect(Object.keys(vars).length).toBeGreaterThan(0)
  })
})
