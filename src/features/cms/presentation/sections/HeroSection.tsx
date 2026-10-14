import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'

import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import { storefrontButton } from '@/features/products/presentation/buttonStyles'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

import type { Cta, ImageRef } from '../../domain/common'
import { isCtaSet } from '../../domain/common'
import type { SectionOf } from '../../domain/sections'
import { CtaLink } from './CtaLink'
import { anchorClass, anchorId } from './shared'

type Hero = SectionOf<'hero'>

const HEIGHT_CLASS: Record<Hero['height'], string> = {
  compact: 'min-h-[50vh]',
  default: 'min-h-[70vh]',
  tall: 'min-h-[85vh]',
}

/** Swipe distance (px) before a touch gesture changes slide. */
const SWIPE_THRESHOLD = 40

interface Slide {
  image: ImageRef
  eyebrow: string
  title: string
  subtitle: string
  cta: Cta
  secondaryCta?: Cta
}

function toSlides(section: Hero): Slide[] {
  return [
    {
      image: section.image,
      eyebrow: section.eyebrow,
      title: section.title,
      subtitle: section.subtitle,
      cta: section.primaryCta,
      secondaryCta: section.secondaryCta,
    },
    ...section.slides,
  ]
}

/** Headline, copy and buttons for one slide. Re-mounted per slide so the rise-in replays. */
function HeroCopy({
  slide,
  centered,
  animate,
}: {
  slide: Slide
  centered: boolean
  animate: boolean
}) {
  const primary = isCtaSet(slide.cta) ? slide.cta : null
  const secondary = slide.secondaryCta && isCtaSet(slide.secondaryCta) ? slide.secondaryCta : null
  return (
    <div
      className={cn(
        'container-x relative py-16 lg:py-24',
        centered && 'flex flex-col items-center text-center',
        animate && 'reveal-visible',
      )}
    >
      {slide.eyebrow ? (
        <p className="mb-4 text-xs font-medium tracking-[0.25em] text-white/70 uppercase">
          {slide.eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          'heading-display max-w-3xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl',
          centered && 'mx-auto',
        )}
      >
        {slide.title}
      </h1>
      {slide.subtitle ? (
        <p
          className={cn('mt-5 max-w-xl text-base text-white/80 sm:text-lg', centered && 'mx-auto')}
        >
          {slide.subtitle}
        </p>
      ) : null}
      {primary || secondary ? (
        <div className={cn('mt-8 flex flex-wrap gap-3', centered && 'justify-center')}>
          {primary ? (
            <Button
              asChild
              size="lg"
              className={storefrontButton('min-h-12 bg-white px-8 text-black hover:bg-white/90')}
            >
              <CtaLink href={primary.href}>{primary.label}</CtaLink>
            </Button>
          ) : null}
          {secondary ? (
            <Button
              asChild
              size="lg"
              variant="ghost"
              className={storefrontButton(
                'min-h-12 text-white hover:bg-white/10 hover:text-white hover:shadow-none',
              )}
            >
              <CtaLink href={secondary.href}>
                {secondary.label}
                <ArrowRight aria-hidden="true" />
              </CtaLink>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function HeroImage({ image, priority }: { image: ImageRef; priority: boolean }) {
  return (
    <ProductImage
      src={image.url || null}
      alt={image.alt}
      decorative={!image.alt}
      priority={priority}
      aspect="fill"
      className="absolute inset-0 bg-[var(--brand-ink)]"
      sizes="100vw"
    />
  )
}

/** Autoplaying crossfade slideshow (Spotlight "slideshow" section). */
function HeroSlideshow({ section, slides }: { section: Hero; slides: Slide[] }) {
  const centered = section.align === 'center'
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(() =>
    typeof document === 'undefined' ? false : document.hidden,
  )
  const swipeStart = useRef<{ x: number; id: number } | null>(null)
  const total = slides.length

  const go = useCallback((next: number) => setActive(((next % total) + total) % total), [total])

  const autoplaying = section.autoplaySeconds > 0 && !reducedMotion && !paused && !hidden

  useEffect(() => {
    if (!autoplaying) return
    const id = window.setInterval(() => go(active + 1), section.autoplaySeconds * 1000)
    return () => window.clearInterval(id)
  }, [autoplaying, active, go, section.autoplaySeconds])

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') return
    swipeStart.current = { x: event.clientX, id: event.pointerId }
  }
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    go(dx < 0 ? active + 1 : active - 1)
  }

  const current = slides[active] ?? slides[0]
  if (!current) return null

  return (
    <section
      id={anchorId(section)}
      className={cn(
        'relative flex items-end overflow-hidden bg-[var(--brand-ink)] text-white',
        HEIGHT_CLASS[section.height],
        anchorClass(section),
      )}
      aria-roledescription="carousel"
      aria-live={autoplaying ? 'off' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={cn(
            'absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none',
            index === active ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden={index !== active || undefined}
        >
          <HeroImage image={slide.image} priority={index === 0} />
        </div>
      ))}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"
        aria-hidden="true"
      />
      <div
        key={active}
        role="group"
        aria-roledescription="slide"
        aria-label={`${active + 1} of ${total}`}
        className="relative w-full"
      >
        <HeroCopy slide={current} centered={centered} animate={!reducedMotion} />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-1/2 left-4 hidden size-11 -translate-y-1/2 rounded-full border-white/40 bg-black/30 text-white hover:bg-black/50 hover:text-white md:inline-flex"
        aria-label="Previous slide"
        onClick={() => go(active - 1)}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-1/2 right-4 hidden size-11 -translate-y-1/2 rounded-full border-white/40 bg-black/30 text-white hover:bg-black/50 hover:text-white md:inline-flex"
        aria-label="Next slide"
        onClick={() => go(active + 1)}
      >
        <ChevronRight aria-hidden="true" />
      </Button>

      <div
        role="tablist"
        aria-label="Slides"
        className="absolute inset-x-0 bottom-4 flex justify-center gap-2"
      >
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={`Slide ${index + 1}`}
            onClick={() => go(index)}
            className="flex size-6 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                'block size-2 rounded-full border border-white transition-colors duration-200',
                index === active ? 'bg-white' : 'bg-transparent',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}

export function HeroSection({ section }: { section: Hero }) {
  const slides = useMemo(() => toSlides(section), [section])
  if (section.slides.length > 0) return <HeroSlideshow section={section} slides={slides} />

  const only = slides[0]
  if (!only) return null
  return (
    <section
      id={anchorId(section)}
      className={cn(
        'relative flex items-end overflow-hidden bg-[var(--brand-ink)] text-white',
        HEIGHT_CLASS[section.height],
        anchorClass(section),
      )}
    >
      <HeroImage image={only.image} priority />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"
        aria-hidden="true"
      />
      <HeroCopy slide={only} centered={section.align === 'center'} animate={false} />
    </section>
  )
}
