import { describe, expect, it } from 'vitest'

import { hexColorSchema } from './common'
import { THEME_DEFAULT } from './defaults'
import { THEME_CSS_KEYS, themeContentSchema, themeToCssVariables } from './theme'

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
