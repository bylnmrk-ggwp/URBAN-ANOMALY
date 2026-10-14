import { ProductImage } from '@/components/common/ProductImage'
import { Marquee } from '@/components/motion/Marquee'
import { cn } from '@/lib/utils'

import type { SectionOf } from '../../domain/sections'
import { anchorClass, anchorId } from './shared'

type ImageMarquee = SectionOf<'image_marquee'>

/** Tile height per size; width follows from the 4:5 ratio. */
const TILE_HEIGHT: Record<ImageMarquee['tileHeight'], string> = {
  sm: 'h-40',
  md: 'h-56 md:h-72',
  lg: 'h-72 md:h-96',
}

/** Endless strip of photos (Spotlight "image marquee"); pauses on hover when enabled. */
export function ImageMarqueeSection({ section }: { section: ImageMarquee }) {
  return (
    <section id={anchorId(section)} className={cn('py-8 lg:py-12', anchorClass(section))}>
      <Marquee
        durationSeconds={section.speed}
        pauseOnHover={section.pauseOnHover}
        ariaLabel="Image marquee"
      >
        {section.images.map((image, index) => (
          <ProductImage
            key={`${index}-${image.mediaId ?? image.url}`}
            src={image.url || null}
            alt={image.alt}
            decorative={!image.alt}
            aspect="4/5"
            className={cn('w-auto shrink-0 rounded-lg', TILE_HEIGHT[section.tileHeight])}
            sizes="(min-width: 768px) 20vw, 40vw"
          />
        ))}
      </Marquee>
    </section>
  )
}
