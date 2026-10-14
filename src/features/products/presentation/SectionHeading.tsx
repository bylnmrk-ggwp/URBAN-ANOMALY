import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  title: string
  eyebrow?: string
  description?: string
  action?: ReactNode
  align?: 'left' | 'center'
  as?: 'h1' | 'h2'
  className?: string
}

/**
 * Section title in the Spotlight register: uppercase, tracked display heading.
 * Left-aligned by default (utility pages); storefront collection sections centre it and
 * the `action` slot then sits under the title instead of beside it.
 */
export function SectionHeading({
  title,
  eyebrow,
  description,
  action,
  align = 'left',
  as: Tag = 'h2',
  className,
}: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 lg:mb-10',
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow ? (
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-[0.2em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <Tag className="heading-display text-2xl sm:text-3xl">{title}</Tag>
        {description ? (
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className={cn('shrink-0', centered && 'mt-1')}>{action}</div> : null}
    </div>
  )
}
