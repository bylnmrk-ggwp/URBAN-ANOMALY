import { useState } from 'react'

import { ProductImage } from '@/components/common/ProductImage'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { cn } from '@/lib/utils'

import type { GalleryImage, SectionOf } from '../../domain/sections'
import { GalleryLightbox } from './GalleryLightbox'
import type { SectionContext } from './shared'
import { anchorClass, anchorId, DEFAULT_SECTION_CONTEXT } from './shared'

interface GallerySectionProps {
  section: SectionOf<'gallery'>
  context?: SectionContext
}

interface TileProps {
  image: GalleryImage
  index: number
  layout: 'grid' | 'columns'
  showCaption: boolean
  onOpen: (index: number) => void
}

function Tile({ image, index, layout, showCaption, onOpen }: TileProps) {
  const label = image.caption || image.alt || `Image ${index + 1}`
  return (
    <figure className={cn(layout === 'columns' && 'mb-3 break-inside-avoid')}>
      <button
        type="button"
        className="focus-visible:ring-ring/50 block w-full overflow-hidden rounded-md outline-none focus-visible:ring-[3px]"
        aria-label={`Open ${label}`}
        onClick={() => onOpen(index)}
      >
        {layout === 'grid' ? (
          <ProductImage
            src={image.url}
            alt={image.alt}
            aspect="square"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            imgClassName="transition-transform duration-300 hover:scale-[1.02]"
          />
        ) : (
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="bg-muted block h-auto w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        )}
      </button>
      {showCaption && image.caption ? (
        <figcaption className="text-muted-foreground mt-2 text-sm leading-snug">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

/** Image grid or CSS-columns masonry; every tile opens the lightbox. */
export function GallerySection({
  section,
  context = DEFAULT_SECTION_CONTEXT,
}: GallerySectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const images = section.images.filter((image) => image.url)

  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-16 lg:py-24', anchorClass(section))}
    >
      {section.title || section.eyebrow ? (
        <SectionHeading
          eyebrow={section.eyebrow || undefined}
          title={section.title}
          align="center"
          as={context.isFirst ? 'h1' : 'h2'}
        />
      ) : null}
      <div
        className={cn(
          section.layout === 'grid'
            ? 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'
            : 'columns-2 gap-3 md:columns-3',
        )}
      >
        {images.map((image, index) => (
          <Tile
            key={`${index}-${image.url}`}
            image={image}
            index={index}
            layout={section.layout}
            showCaption={section.showCaptions}
            onOpen={setOpenIndex}
          />
        ))}
      </div>
      <GalleryLightbox images={images} index={openIndex} onIndexChange={setOpenIndex} />
    </section>
  )
}
