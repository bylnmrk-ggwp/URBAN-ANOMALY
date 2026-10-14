import { z } from 'zod'

import { hexColorSchema } from './common'
import { seasonColors, THEME_SEASONS, type ThemeSeason } from './seasons'

export {
  seasonColors,
  seasonCssText,
  seasonCssVariables,
  seasonSwatches,
  THEME_SEASON_DEFINITIONS,
  THEME_SEASONS,
  type ThemeSeason,
} from './seasons'

export const THEME_FONTS = ['Inter', 'Geist', 'DM Sans', 'Manrope'] as const

export const themeContentSchema = z.object({
  /**
   * Seasonal brand variant: logo artwork plus palette (see ./seasons.ts). Defaulted, so a
   * theme document stored before seasons existed still parses.
   */
  season: z.enum(THEME_SEASONS).default('default'),
  colors: z.object({
    primary: hexColorSchema,
    primaryForeground: hexColorSchema,
    background: hexColorSchema,
    foreground: hexColorSchema,
    muted: hexColorSchema,
    mutedForeground: hexColorSchema,
    border: hexColorSchema,
  }),
  fontFamily: z.enum(THEME_FONTS),
  radius: z.enum(['none', 'sm', 'md', 'lg']),
  buttonStyle: z.enum(['square', 'rounded', 'pill']),
  sectionSpacing: z.enum(['compact', 'default', 'spacious']),
})
export type ThemeContent = z.infer<typeof themeContentSchema>

const RADIUS_REM: Record<ThemeContent['radius'], string> = {
  none: '0rem',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.75rem',
}

const BUTTON_RADIUS: Record<ThemeContent['buttonStyle'], string> = {
  square: '0rem',
  rounded: 'var(--radius)',
  pill: '9999px',
}

const SECTION_SPACING: Record<ThemeContent['sectionSpacing'], string> = {
  compact: '0.7',
  default: '1',
  spacious: '1.3',
}

/**
 * Maps theme content onto the CSS custom properties already declared in globals.css.
 * Only these keys are ever written, so a stored theme can never inject arbitrary CSS.
 */
export function themeToCssVariables(theme: ThemeContent): Record<string, string> {
  const c = theme.colors
  return {
    '--primary': c.primary,
    '--primary-foreground': c.primaryForeground,
    '--ring': c.primary,
    '--background': c.background,
    '--foreground': c.foreground,
    '--card': c.background,
    '--card-foreground': c.foreground,
    '--popover': c.background,
    '--popover-foreground': c.foreground,
    '--muted': c.muted,
    '--secondary': c.muted,
    '--accent': c.muted,
    '--muted-foreground': c.mutedForeground,
    '--border': c.border,
    '--input': c.border,
    '--radius': RADIUS_REM[theme.radius],
    '--button-radius': BUTTON_RADIUS[theme.buttonStyle],
    '--section-scale': SECTION_SPACING[theme.sectionSpacing],
    '--font-sans': `'${theme.fontFamily}', ui-sans-serif, system-ui, sans-serif`,
  }
}

/** The type and shape tokens globals.css declares, i.e. the values that need no override. */
export const THEME_SHAPE_DEFAULT = {
  fontFamily: 'Inter',
  radius: 'md',
  buttonStyle: 'rounded',
  sectionSpacing: 'default',
} as const satisfies Omit<ThemeContent, 'season' | 'colors'>

/** What a season looks like untouched: its palette on the shipped type and shape tokens. */
export function seasonBaselineTheme(season: ThemeSeason): ThemeContent {
  return { season, colors: seasonColors(season), ...THEME_SHAPE_DEFAULT }
}

/**
 * The subset of `themeToCssVariables` that differs from the season's untouched baseline. A
 * theme left on its season's palette and the shipped shape tokens yields `{}`, so
 * `ThemeApplier` writes no inline styles and the stylesheet (and with it dark mode) stays in
 * charge. Hand-edited values are written exactly as before.
 */
export function themeCssOverrides(theme: ThemeContent): Record<string, string> {
  const baseline = themeToCssVariables(seasonBaselineTheme(theme.season))
  return Object.fromEntries(
    Object.entries(themeToCssVariables(theme)).filter(([key, value]) => baseline[key] !== value),
  )
}

export const THEME_CSS_KEYS = Object.keys(
  themeToCssVariables({
    season: 'default',
    colors: {
      primary: '#000000',
      primaryForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#000000',
      muted: '#ffffff',
      mutedForeground: '#000000',
      border: '#000000',
    },
    ...THEME_SHAPE_DEFAULT,
  }),
)
