import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/domain/entities'
import { cn } from '@/lib/utils'

import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from './ProductCardSkeleton'

/** Card width per breakpoint: a slice of the next card peeks in to invite scrolling. */
export const CAROUSEL_CARD_CLASS = 'w-[72vw] sm:w-[44vw] md:w-[31vw] lg:w-[23%]'

interface ProductCarouselProps {
  products?: Product[]
  isLoading?: boolean
  skeletonCount?: number
  /** Number of leading cards whose images load eagerly. */
  priorityCount?: number
  /** Accessible name of the carousel region. */
  label?: string
  className?: string
}

interface SliderState {
  index: number
  canPrev: boolean
  canNext: boolean
}

/** Distance between two consecutive cards; falls back to the viewport when unmeasurable (jsdom). */
function stepOf(scroller: HTMLElement): number {
  const [first, second] = Array.from(scroller.children) as HTMLElement[]
  if (first && second) {
    const step = second.offsetLeft - first.offsetLeft
    if (step > 0) return step
  }
  return first?.offsetWidth || scroller.clientWidth || 1
}

function readState(scroller: HTMLElement, total: number): SliderState {
  const step = stepOf(scroller)
  const overflow = scroller.scrollWidth - scroller.clientWidth
  const index = Math.min(total, Math.max(1, Math.round(scroller.scrollLeft / step) + 1))
  // Unmeasured layout (tests / before first paint): assume more cards lie to the right.
  const unmeasured = scroller.scrollWidth === 0
  return {
    index,
    canPrev: scroller.scrollLeft > 1,
    canNext: unmeasured ? total > 1 : scroller.scrollLeft < overflow - 1,
  }
}

/**
 * Horizontal, snap-scrolling row of product cards with Spotlight-style prev/next arrows
 * and a `current / total` counter. Arrows hide below `md`, where native swipe scrolls.
 */
export function ProductCarousel({
  products = [],
  isLoading = false,
  skeletonCount = 4,
  priorityCount = 0,
  label = 'Products',
  className,
}: ProductCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const frame = useRef<number | null>(null)
  const total = isLoading ? skeletonCount : products.length
  const [state, setState] = useState<SliderState>({
    index: 1,
    canPrev: false,
    canNext: total > 1,
  })

  const sync = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setState(readState(scroller, total))
  }, [total])

  useEffect(() => {
    sync()
    const scroller = scrollerRef.current
    if (!scroller) return
    const onScroll = () => {
      if (frame.current !== null) return
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        sync()
      })
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [sync])

  const scrollBy = (direction: -1 | 1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const step = stepOf(scroller)
    const target = (Math.round(scroller.scrollLeft / step) + direction) * step
    scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' && state.canPrev) {
      event.preventDefault()
      scrollBy(-1)
    } else if (event.key === 'ArrowRight' && state.canNext) {
      event.preventDefault()
      scrollBy(1)
    }
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('relative', className)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={scrollerRef}
        className="snap-row -mx-4 scroll-px-4 px-4 pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0"
        aria-busy={isLoading || undefined}
      >
        {isLoading
          ? Array.from({ length: skeletonCount }, (_, index) => (
              <div key={index} className={CAROUSEL_CARD_CLASS}>
                <ProductCardSkeleton />
              </div>
            ))
          : products.map((product, index) => (
              <div key={product.id} className={CAROUSEL_CARD_CLASS}>
                <ProductCard product={product} priority={index < priorityCount} />
              </div>
            ))}
      </div>

      {total > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-11 rounded-full md:inline-flex"
            aria-label="Previous products"
            disabled={!state.canPrev}
            onClick={() => scrollBy(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span
            aria-live="polite"
            className="text-muted-foreground min-w-12 text-center text-xs tracking-[0.12em] tabular-nums"
          >
            {state.index} / {total}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="hidden size-11 rounded-full md:inline-flex"
            aria-label="Next products"
            disabled={!state.canNext}
            onClick={() => scrollBy(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
