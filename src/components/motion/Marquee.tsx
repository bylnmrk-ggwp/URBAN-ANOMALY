import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface MarqueeProps {
  children: ReactNode
  /** Seconds for one full loop. Lower is faster. */
  durationSeconds?: number
  /** Pause on hover (default true), like Spotlight's marquee sections. */
  pauseOnHover?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * Continuous horizontal marquee. Content is duplicated once so the loop is seamless;
 * the copy is aria-hidden so screen readers hear it once.
 */
export function Marquee({
  children,
  durationSeconds = 40,
  pauseOnHover = true,
  className,
  ariaLabel,
}: MarqueeProps) {
  return (
    <div
      className={cn('overflow-hidden', !pauseOnHover && 'marquee-paused', className)}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
    >
      <div
        className="marquee-track"
        style={{ ['--marquee-duration' as string]: `${durationSeconds}s` }}
      >
        <div className="flex shrink-0 gap-4 pr-4">{children}</div>
        <div className="flex shrink-0 gap-4 pr-4" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
