import type { ComponentPropsWithoutRef, ElementType } from 'react'

import { useScrollReveal } from '@/hooks/useScrollReveal'
import { cn } from '@/lib/utils'

type RevealProps<T extends ElementType> = {
  as?: T
  /** `slide` (default) rises 2rem while fading; `fade` only fades. */
  effect?: 'slide' | 'fade'
  /** Stagger delay in ms, e.g. for cards in a row. */
  delay?: number
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>

/** Wraps children in a scroll-triggered reveal. Renders a plain element once visible. */
export function Reveal<T extends ElementType = 'div'>({
  as,
  effect = 'slide',
  delay = 0,
  className,
  style,
  ...rest
}: RevealProps<T>) {
  const Tag = (as ?? 'div') as ElementType
  const [ref, visible] = useScrollReveal<HTMLElement>()
  const hidden = effect === 'slide' ? 'reveal' : 'reveal-fade'
  const shown = effect === 'slide' ? 'reveal-visible' : 'reveal-fade-visible'
  return (
    <Tag
      ref={ref}
      className={cn(visible ? shown : hidden, className)}
      style={delay ? { animationDelay: `${delay}ms`, ...style } : style}
      {...rest}
    />
  )
}
