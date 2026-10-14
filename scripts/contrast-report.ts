/**
 * Prints the WCAG contrast ratio of every text pair in every season, in both modes.
 * Run with: npx vite-node scripts/contrast-report.ts
 */
import {
  seasonCssVariables,
  THEME_SEASONS,
  type SeasonMode,
} from '../src/features/cms/domain/seasons'

const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255)
    .map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

const PAIRS: ReadonlyArray<[string, string]> = [
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

const modes: SeasonMode[] = ['light', 'dark']
let worst = Infinity
let fails = 0

console.log('| season | mode | pair | colours | ratio | AA |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const season of THEME_SEASONS) {
  for (const mode of modes) {
    const tokens = seasonCssVariables(season, mode)
    for (const [fg, bg] of PAIRS) {
      const a = tokens[fg] ?? '#ffffff'
      const b = tokens[bg] ?? '#ffffff'
      const ratio = contrast(a, b)
      worst = Math.min(worst, ratio)
      if (ratio < 4.5) fails += 1
      console.log(
        `| ${season} | ${mode} | ${fg.slice(2)} on ${bg.slice(2)} | ${a} / ${b} | ${ratio.toFixed(2)}:1 | ${ratio >= 4.5 ? 'pass' : 'FAIL'} |`,
      )
    }
    const ink = tokens['--brand-ink'] ?? '#000000'
    const inkRatio = contrast('#ffffff', ink)
    worst = Math.min(worst, inkRatio)
    if (inkRatio < 4.5) fails += 1
    console.log(
      `| ${season} | ${mode} | white on brand-ink (hero) | #ffffff / ${ink} | ${inkRatio.toFixed(2)}:1 | ${inkRatio >= 4.5 ? 'pass' : 'FAIL'} |`,
    )
  }
}
console.log(`\npairs checked: ${THEME_SEASONS.length * modes.length * (PAIRS.length + 1)}`)
console.log(`failures: ${fails}`)
console.log(`worst ratio: ${worst.toFixed(2)}:1`)
