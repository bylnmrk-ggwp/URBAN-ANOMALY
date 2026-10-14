import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

interface StarRatingProps {
  /** 0–5, may be fractional (e.g. 4.5). */
  value: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' } as const

/** Read-only stars. Partial stars are clipped so an average like 4.5 reads as four and a half. */
export function StarRating({ value, size = 'md', className }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value))
  const label = `${Number.isInteger(clamped) ? clamped : clamped.toFixed(1)} out of 5`

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i))
        return (
          <span key={i} className={cn('relative inline-block shrink-0', sizeClasses[size])}>
            <Star
              className="text-border absolute inset-0 size-full fill-current"
              aria-hidden="true"
            />
            {fill > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
                aria-hidden="true"
              >
                <Star className={cn('text-foreground fill-current', sizeClasses[size])} />
              </span>
            ) : null}
          </span>
        )
      })}
    </span>
  )
}
