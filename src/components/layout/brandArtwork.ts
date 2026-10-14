import { usePublishedDocument } from '@/features/cms/application/usePublishedDocument'
import { GLOBAL_KEYS } from '@/features/cms/domain/documents'
import type { ThemeSeason } from '@/features/cms/domain/theme'

/**
 * Brand artwork per season, served from public/ so it stays out of the JS bundle.
 *
 * The default season ships two cuts — a symbol and a script wordmark — both in olive ink, dark
 * enough on a dark surface to need `brightness-175`. The seasonal variants are single stacked
 * lockups, already light and bright, so each one serves as both mark and wordmark and only the
 * size differs: a stacked lockup needs more height than the wide script to stay legible, and
 * has width to spare in the slots where the script is the tight fit.
 */
interface BrandArt {
  src: string
  width: number
  height: number
}

export interface SeasonLogos {
  /** Square-ish slot: the collapsed admin sidebar. */
  mark: BrandArt
  /** Wide slot: the storefront header and the expanded admin sidebar. */
  wordmark: BrandArt
  /**
   * Maximum height, plus any ink correction; width always follows the aspect ratio. A max rather
   * than a fixed height so a slot narrower than the artwork (preflight `max-width: 100%`) scales
   * it down instead of squashing it.
   */
  markClass: string
  wordmarkClass: string
  /** Wordmark in a tight slot — the 16rem admin sidebar header. */
  wordmarkCompactClass: string
}

export const SEASON_ARTWORK: Record<ThemeSeason, SeasonLogos> = {
  default: {
    mark: { src: '/logo-symbol.png', width: 154, height: 80 },
    wordmark: { src: '/logo-long.png', width: 445, height: 59 },
    markClass: 'max-h-7 dark:brightness-175',
    wordmarkClass: 'max-h-6 sm:max-h-7 dark:brightness-175',
    wordmarkCompactClass: 'max-h-5 dark:brightness-175',
  },
  camo: {
    mark: { src: '/logo-camo.png', width: 235, height: 138 },
    wordmark: { src: '/logo-camo.png', width: 235, height: 138 },
    markClass: 'max-h-7',
    wordmarkClass: 'max-h-9 sm:max-h-10',
    wordmarkCompactClass: 'max-h-8',
  },
  christmas: {
    mark: { src: '/logo-christmas.png', width: 253, height: 145 },
    wordmark: { src: '/logo-christmas.png', width: 253, height: 145 },
    markClass: 'max-h-7',
    wordmarkClass: 'max-h-9 sm:max-h-10',
    wordmarkCompactClass: 'max-h-8',
  },
}

/** Kept for callers that need the raw path: the default season's artwork. */
export const BRAND_MARK_SRC = SEASON_ARTWORK.default.mark.src
export const BRAND_WORDMARK_SRC = SEASON_ARTWORK.default.wordmark.src

/** The published season. Falls back to `default` until the theme document loads. */
export function useBrandSeason(): ThemeSeason {
  const { content } = usePublishedDocument('theme', GLOBAL_KEYS.theme)
  return content.season
}
