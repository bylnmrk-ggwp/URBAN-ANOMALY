/**
 * Seasonal brand variants. The brand ships three logo cuts, and each one carries a palette
 * sampled from its artwork: the default olive ink, the grey CAMO fill and the red/gold
 * CHRISTMAS lockup.
 *
 * Both modes are declared here, not in globals.css, because the theme editor applies a season
 * at runtime: `ThemeApplier` writes a stylesheet with a `:root` and a `.dark` rule so dark mode
 * keeps working (inline styles on `<html>` would beat the `.dark` class rules in the sheet).
 * The `default` season is the stylesheet's own palette — `seasons.test.ts` parses globals.css
 * and fails if the two drift.
 *
 * Every pair that carries text (foreground/background, muted-foreground on all three surfaces,
 * primary-foreground on primary, secondary/accent foregrounds, and the sidebar set) clears WCAG
 * AA 4.5:1 in both modes; `seasons.test.ts` recomputes the ratios.
 */

export const THEME_SEASONS = ['default', 'camo', 'christmas'] as const
export type ThemeSeason = (typeof THEME_SEASONS)[number]

/**
 * The CSS custom properties a season owns. Status colours (`--destructive`, `--success`,
 * `--warning`, `--info`) stay off-brand on purpose and are never seasonal, and the shape
 * tokens (`--radius`, `--button-radius`, `--section-scale`) belong to the theme editor.
 */
export const SEASON_CSS_KEYS = [
  '--brand-ink',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--accent',
  '--accent-foreground',
  '--border',
  '--input',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
] as const

export type SeasonCssKey = (typeof SEASON_CSS_KEYS)[number]
export type SeasonTokens = Record<SeasonCssKey, string>
export type SeasonMode = 'light' | 'dark'

/** The seven values the theme editor exposes; they mirror the season's light tokens. */
export interface SeasonEditableColors {
  primary: string
  primaryForeground: string
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  border: string
}

export interface SeasonDefinition {
  label: string
  /** One line for the admin picker. */
  blurb: string
  light: SeasonTokens
  dark: SeasonTokens
}

/** Mirrors the `:root` block in src/styles/globals.css. */
const DEFAULT_LIGHT: SeasonTokens = {
  '--brand-ink': '#0f120e',
  '--background': '#ffffff',
  '--foreground': '#0f120e',
  '--card': '#ffffff',
  '--card-foreground': '#0f120e',
  '--popover': '#ffffff',
  '--popover-foreground': '#0f120e',
  '--primary': '#5c7454',
  '--primary-foreground': '#ffffff',
  '--secondary': '#f1f3ef',
  '--secondary-foreground': '#2f3d2b',
  '--muted': '#f1f3ef',
  '--muted-foreground': '#5a6356',
  '--accent': '#e4e9e0',
  '--accent-foreground': '#2f3d2b',
  '--border': '#dde2d8',
  '--input': '#dde2d8',
  '--ring': '#5c7454',
  '--chart-1': '#5c7454',
  '--chart-2': '#8fa686',
  '--chart-3': '#44593c',
  '--chart-4': '#b3c2ab',
  '--chart-5': '#2f3d2b',
  '--sidebar': '#f7f8f6',
  '--sidebar-foreground': '#0f120e',
  '--sidebar-primary': '#5c7454',
  '--sidebar-primary-foreground': '#ffffff',
  '--sidebar-accent': '#e4e9e0',
  '--sidebar-accent-foreground': '#2f3d2b',
  '--sidebar-border': '#dde2d8',
  '--sidebar-ring': '#5c7454',
}

/** Mirrors the `.dark` block in src/styles/globals.css. */
const DEFAULT_DARK: SeasonTokens = {
  '--brand-ink': '#0f120e',
  '--background': '#0b0d0a',
  '--foreground': '#eef1ec',
  '--card': '#131710',
  '--card-foreground': '#eef1ec',
  '--popover': '#131710',
  '--popover-foreground': '#eef1ec',
  '--primary': '#8fa686',
  '--primary-foreground': '#0b0d0a',
  '--secondary': '#1c2118',
  '--secondary-foreground': '#eef1ec',
  '--muted': '#1c2118',
  '--muted-foreground': '#a7b0a2',
  '--accent': '#242b20',
  '--accent-foreground': '#eef1ec',
  '--border': '#2a3125',
  '--input': '#2a3125',
  '--ring': '#8fa686',
  '--chart-1': '#8fa686',
  '--chart-2': '#b3c2ab',
  '--chart-3': '#5c7454',
  '--chart-4': '#d3dccd',
  '--chart-5': '#eef1ec',
  '--sidebar': '#0f120e',
  '--sidebar-foreground': '#eef1ec',
  '--sidebar-primary': '#8fa686',
  '--sidebar-primary-foreground': '#0b0d0a',
  '--sidebar-accent': '#1c2118',
  '--sidebar-accent-foreground': '#eef1ec',
  '--sidebar-border': '#2a3125',
  '--sidebar-ring': '#8fa686',
}

/**
 * CAMO: the artwork is a neutral grey ramp (#888888 dominant, up to #d8d8d8) with no hue, so
 * the palette stays hueless. White on #888888 is only 3.59:1, so the ramp is extended to
 * #4a4a4a for the primary; the sampled greys carry the surfaces, lines and charts.
 */
const CAMO_LIGHT: SeasonTokens = {
  '--brand-ink': '#0e0e0e',
  '--background': '#ffffff',
  '--foreground': '#131313',
  '--card': '#ffffff',
  '--card-foreground': '#131313',
  '--popover': '#ffffff',
  '--popover-foreground': '#131313',
  '--primary': '#4a4a4a',
  '--primary-foreground': '#ffffff',
  '--secondary': '#f2f2f2',
  '--secondary-foreground': '#2b2b2b',
  '--muted': '#f2f2f2',
  '--muted-foreground': '#585858',
  '--accent': '#e3e3e3',
  '--accent-foreground': '#2b2b2b',
  '--border': '#d8d8d8',
  '--input': '#d8d8d8',
  '--ring': '#4a4a4a',
  '--chart-1': '#4a4a4a',
  '--chart-2': '#888888',
  '--chart-3': '#2b2b2b',
  '--chart-4': '#b8b8b8',
  '--chart-5': '#131313',
  '--sidebar': '#f7f7f7',
  '--sidebar-foreground': '#131313',
  '--sidebar-primary': '#4a4a4a',
  '--sidebar-primary-foreground': '#ffffff',
  '--sidebar-accent': '#e3e3e3',
  '--sidebar-accent-foreground': '#2b2b2b',
  '--sidebar-border': '#d8d8d8',
  '--sidebar-ring': '#4a4a4a',
}

/** CAMO dark: the light end of the ramp (#c8c8c8, #a8a8a8) leads on near-black. */
const CAMO_DARK: SeasonTokens = {
  '--brand-ink': '#0e0e0e',
  '--background': '#0c0c0c',
  '--foreground': '#efefef',
  '--card': '#151515',
  '--card-foreground': '#efefef',
  '--popover': '#151515',
  '--popover-foreground': '#efefef',
  '--primary': '#c8c8c8',
  '--primary-foreground': '#0c0c0c',
  '--secondary': '#1e1e1e',
  '--secondary-foreground': '#efefef',
  '--muted': '#1e1e1e',
  '--muted-foreground': '#a8a8a8',
  '--accent': '#272727',
  '--accent-foreground': '#efefef',
  '--border': '#2e2e2e',
  '--input': '#2e2e2e',
  '--ring': '#c8c8c8',
  '--chart-1': '#c8c8c8',
  '--chart-2': '#a8a8a8',
  '--chart-3': '#888888',
  '--chart-4': '#d8d8d8',
  '--chart-5': '#efefef',
  '--sidebar': '#101010',
  '--sidebar-foreground': '#efefef',
  '--sidebar-primary': '#c8c8c8',
  '--sidebar-primary-foreground': '#0c0c0c',
  '--sidebar-accent': '#1e1e1e',
  '--sidebar-accent-foreground': '#efefef',
  '--sidebar-border': '#2e2e2e',
  '--sidebar-ring': '#c8c8c8',
}

/**
 * CHRISTMAS: #a80808 dominant red leads (white on it is 7.77:1), #880808 and #c82828 fill the
 * chart ramp, and the ornament gold (#c8a236) becomes the accent — as a pale tint behind dark
 * gold text, since the gold itself is only 2.42:1 against white.
 */
const CHRISTMAS_LIGHT: SeasonTokens = {
  '--brand-ink': '#140f0f',
  '--background': '#ffffff',
  '--foreground': '#140f0f',
  '--card': '#ffffff',
  '--card-foreground': '#140f0f',
  '--popover': '#ffffff',
  '--popover-foreground': '#140f0f',
  '--primary': '#a80808',
  '--primary-foreground': '#ffffff',
  '--secondary': '#f7f1f1',
  '--secondary-foreground': '#3a1414',
  '--muted': '#f7f1f1',
  '--muted-foreground': '#5f5050',
  '--accent': '#f6ecd3',
  '--accent-foreground': '#4a3708',
  '--border': '#e6d9d9',
  '--input': '#e6d9d9',
  '--ring': '#a80808',
  '--chart-1': '#a80808',
  '--chart-2': '#c8a236',
  '--chart-3': '#880808',
  '--chart-4': '#c82828',
  '--chart-5': '#3a1414',
  '--sidebar': '#fbf6f6',
  '--sidebar-foreground': '#140f0f',
  '--sidebar-primary': '#a80808',
  '--sidebar-primary-foreground': '#ffffff',
  '--sidebar-accent': '#f6ecd3',
  '--sidebar-accent-foreground': '#4a3708',
  '--sidebar-border': '#e6d9d9',
  '--sidebar-ring': '#a80808',
}

/**
 * CHRISTMAS dark: #a80808 on near-black is 2.47:1, far too dark to carry ink or to sit under
 * `text-primary`, so the red is lifted to #e05252 (5.19:1) exactly as the olive lifts to its
 * soft tone. The gold returns as warm ink on a deep gold-brown accent.
 */
const CHRISTMAS_DARK: SeasonTokens = {
  '--brand-ink': '#140f0f',
  '--background': '#0d0909',
  '--foreground': '#f2eceb',
  '--card': '#17100f',
  '--card-foreground': '#f2eceb',
  '--popover': '#17100f',
  '--popover-foreground': '#f2eceb',
  '--primary': '#e05252',
  '--primary-foreground': '#0d0909',
  '--secondary': '#231616',
  '--secondary-foreground': '#f2eceb',
  '--muted': '#231616',
  '--muted-foreground': '#b5a3a3',
  '--accent': '#2c2114',
  '--accent-foreground': '#ecd9a3',
  '--border': '#322020',
  '--input': '#322020',
  '--ring': '#e05252',
  '--chart-1': '#e05252',
  '--chart-2': '#d8b44a',
  '--chart-3': '#c82828',
  '--chart-4': '#ecd9a3',
  '--chart-5': '#f2eceb',
  '--sidebar': '#120c0c',
  '--sidebar-foreground': '#f2eceb',
  '--sidebar-primary': '#e05252',
  '--sidebar-primary-foreground': '#0d0909',
  '--sidebar-accent': '#231616',
  '--sidebar-accent-foreground': '#f2eceb',
  '--sidebar-border': '#322020',
  '--sidebar-ring': '#e05252',
}

export const THEME_SEASON_DEFINITIONS: Record<ThemeSeason, SeasonDefinition> = {
  default: {
    label: 'Default',
    blurb: 'Olive ink on white — the year-round mark.',
    light: DEFAULT_LIGHT,
    dark: DEFAULT_DARK,
  },
  camo: {
    label: 'Camo',
    blurb: 'Grey camo fill, hueless neutrals.',
    light: CAMO_LIGHT,
    dark: CAMO_DARK,
  },
  christmas: {
    label: 'Christmas',
    blurb: 'Holiday red with ornament gold.',
    light: CHRISTMAS_LIGHT,
    dark: CHRISTMAS_DARK,
  },
}

/** The season's tokens for one mode. The returned object is a copy and safe to mutate. */
export function seasonCssVariables(
  season: ThemeSeason,
  mode: SeasonMode = 'light',
): Record<string, string> {
  const definition = THEME_SEASON_DEFINITIONS[season]
  return { ...(mode === 'dark' ? definition.dark : definition.light) }
}

/** The season's light tokens projected onto the seven colours the theme editor exposes. */
export function seasonColors(season: ThemeSeason): SeasonEditableColors {
  const t = THEME_SEASON_DEFINITIONS[season].light
  return {
    primary: t['--primary'],
    primaryForeground: t['--primary-foreground'],
    background: t['--background'],
    foreground: t['--foreground'],
    muted: t['--muted'],
    mutedForeground: t['--muted-foreground'],
    border: t['--border'],
  }
}

/** Swatches for the admin picker: primary, surface, accent and line, in that order. */
export function seasonSwatches(season: ThemeSeason): string[] {
  const t = THEME_SEASON_DEFINITIONS[season].light
  return [t['--primary'], t['--chart-2'], t['--accent'], t['--border']]
}

/**
 * A stylesheet applying the season in both modes. Keys come from `SEASON_CSS_KEYS` and values
 * from the table above, so nothing user-supplied is ever interpolated into CSS. The default
 * season returns an empty string: globals.css already declares it.
 */
export function seasonCssText(season: ThemeSeason): string {
  if (season === 'default') return ''
  const block = (selector: string, mode: SeasonMode) => {
    const tokens = THEME_SEASON_DEFINITIONS[season][mode]
    const body = SEASON_CSS_KEYS.map((key) => `  ${key}: ${tokens[key]};`).join('\n')
    return `${selector} {\n${body}\n}`
  }
  return `${block(':root', 'light')}\n${block('.dark', 'dark')}\n`
}
