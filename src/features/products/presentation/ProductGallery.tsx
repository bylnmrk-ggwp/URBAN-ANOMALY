import { useRef, useState } from 'react'

import { ProductImage } from '@/components/common/ProductImage'
import type { ProductImage as ProductImageEntity } from '@/features/products/domain/entities'
import { cn } from '@/lib/utils'

interface ProductGalleryProps {
  images: ProductImageEntity[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder)
  const current = sorted[selected] ?? sorted[0] ?? null

  const scrollTo = (index: number) => {
    setSelected(index)
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const index = Math.round(track.scrollLeft / track.clientWidth)
    if (index !== selected) setSelected(index)
  }

  if (sorted.length === 0) {
    return <ProductImage src={null} alt={productName} priority />
  }

  return (
    <div>
      {/* Mobile: snap-scroll carousel */}
      <div className="lg:hidden">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-md [&::-webkit-scrollbar]:hidden"
          aria-roledescription="carousel"
          aria-label={`${productName} images`}
        >
          {sorted.map((image, index) => (
            <div
              key={image.id}
              className="w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${sorted.length}`}
            >
              <ProductImage
                src={image.url}
                alt={image.alt || productName}
                priority={index === 0}
                sizes="100vw"
              />
            </div>
          ))}
        </div>
        {sorted.length > 1 ? (
          <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Choose image">
            {sorted.map((image, index) => (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={index === selected}
                aria-label={`Image ${index + 1}`}
                onClick={() => scrollTo(index)}
                className="flex size-11 items-center justify-center"
              >
                <span
                  className={cn(
                    'block size-2 rounded-full transition-colors',
                    index === selected ? 'bg-foreground' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Desktop: thumbnails + main image */}
      <div className="hidden gap-4 lg:flex">
        {sorted.length > 1 ? (
          <ul className="flex w-20 shrink-0 flex-col gap-3" aria-label="Product thumbnails">
            {sorted.map((image, index) => (
              <li key={image.id}>
                <button
                  type="button"
                  aria-pressed={index === selected}
                  aria-label={`Show image ${index + 1} of ${sorted.length}`}
                  onClick={() => setSelected(index)}
                  className={cn(
                    'block w-full overflow-hidden rounded-md border-2 transition-colors',
                    index === selected
                      ? 'border-foreground'
                      : 'hover:border-muted-foreground/40 border-transparent',
                  )}
                >
                  <ProductImage src={image.url} alt="" decorative sizes="80px" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="min-w-0 flex-1">
          {current ? (
            <ProductImage
              key={current.id}
              src={current.url}
              alt={current.alt || productName}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="rounded-md"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
