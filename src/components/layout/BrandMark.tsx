import { cn } from '@/lib/utils'

/**
 * Brand artwork, served from public/ so it stays out of the JS bundle.
 * `BrandMark` is the UA symbol; `BrandWordmark` is the horizontal "Urban Anomaly" script.
 * Both are raster crops of the logo sheet — swap in the vector exports when they land.
 */
export const BRAND_MARK_SRC = '/logo-symbol.png'
export const BRAND_WORDMARK_SRC = '/logo-long.png'

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={BRAND_MARK_SRC}
      alt=""
      aria-hidden="true"
      width={154}
      height={80}
      className={cn('h-7 w-auto shrink-0 dark:brightness-175', className)}
    />
  )
}

export function BrandWordmark({ alt, className }: { alt: string; className?: string }) {
  return (
    <img
      src={BRAND_WORDMARK_SRC}
      alt={alt}
      width={445}
      height={59}
      className={cn('h-6 w-auto shrink-0 sm:h-7 dark:brightness-175', className)}
    />
  )
}
