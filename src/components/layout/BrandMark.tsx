import type { ThemeSeason } from '@/features/cms/domain/theme'
import { cn } from '@/lib/utils'

import { SEASON_ARTWORK, useBrandSeason } from './brandArtwork'

/**
 * `BrandMark` is the compact brand mark; `BrandWordmark` is the wide lockup beside navigation.
 * Both follow the published theme's season (see features/cms/domain/seasons.ts) and take a
 * `season` prop so the admin can preview a variant before publishing. The artwork table lives
 * in ./brandArtwork.ts.
 */
interface BrandArtProps {
  className?: string
  /** Overrides the published season (used by the admin theme preview). */
  season?: ThemeSeason
}

export function BrandMark({ className, season }: BrandArtProps) {
  const published = useBrandSeason()
  const logos = SEASON_ARTWORK[season ?? published]
  return (
    <img
      src={logos.mark.src}
      alt=""
      aria-hidden="true"
      width={logos.mark.width}
      height={logos.mark.height}
      className={cn('h-auto w-auto shrink-0', logos.markClass, className)}
    />
  )
}

interface BrandWordmarkProps extends BrandArtProps {
  alt: string
  /** Smaller box for narrow slots. */
  compact?: boolean
}

export function BrandWordmark({ alt, className, season, compact }: BrandWordmarkProps) {
  const published = useBrandSeason()
  const logos = SEASON_ARTWORK[season ?? published]
  return (
    <img
      src={logos.wordmark.src}
      alt={alt}
      width={logos.wordmark.width}
      height={logos.wordmark.height}
      className={cn(
        'h-auto w-auto shrink-0',
        compact ? logos.wordmarkCompactClass : logos.wordmarkClass,
        className,
      )}
    />
  )
}
