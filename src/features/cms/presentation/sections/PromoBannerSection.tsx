import { ArrowRight } from 'lucide-react'

import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import { storefrontButton } from '@/features/products/presentation/buttonStyles'
import { cn } from '@/lib/utils'

import { isCtaSet } from '../../domain/common'
import type { SectionOf } from '../../domain/sections'
import { CtaLink } from './CtaLink'
import { anchorClass, anchorId } from './shared'

export function PromoBannerSection({ section }: { section: SectionOf<'promo_banner'> }) {
  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-8 lg:py-12', anchorClass(section))}
    >
      <div className="bg-muted grid overflow-hidden rounded-lg lg:grid-cols-2">
        <ProductImage
          src={section.image.url || null}
          alt={section.image.alt}
          aspect="4/5"
          className={cn(
            'rounded-lg lg:aspect-auto lg:h-full',
            section.imageSide === 'right' && 'lg:order-last',
          )}
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <div className="flex flex-col justify-center p-8 lg:p-16">
          {section.eyebrow ? (
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-[0.2em] uppercase">
              {section.eyebrow}
            </p>
          ) : null}
          <h2 className="heading-display text-2xl sm:text-3xl">{section.title}</h2>
          {section.body ? (
            <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">{section.body}</p>
          ) : null}
          {isCtaSet(section.cta) ? (
            <Button asChild size="lg" className={storefrontButton('mt-8 min-h-12 w-fit px-8')}>
              <CtaLink href={section.cta.href}>
                {section.cta.label}
                <ArrowRight aria-hidden="true" />
              </CtaLink>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
