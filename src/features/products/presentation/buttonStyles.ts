import { cn } from '@/lib/utils'

/**
 * Spotlight-style storefront button look layered on top of the shared `Button` primitive:
 * 2px corners, uppercase tracked label and a 1px "border offset" that thickens on hover.
 * The admin keeps the default primitive, so this is opt-in per call site.
 */
export function storefrontButton(className?: string) {
  return cn(
    '[--button-radius:2px] rounded-[2px] text-xs font-semibold tracking-wider uppercase',
    'transition-[box-shadow,background-color,color,border-color] duration-200',
    'hover:shadow-[0_0_0_1px_currentColor] motion-reduce:transition-none',
    className,
  )
}
