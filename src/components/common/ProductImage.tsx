import { useState } from 'react'

import { cn } from '@/lib/utils'

export type ProductImageAspect = '3/4' | 'square' | '16/9' | '4/5' | 'fill'

const aspectClasses: Record<ProductImageAspect, string> = {
  '3/4': 'aspect-[3/4]',
  square: 'aspect-square',
  '16/9': 'aspect-video',
  '4/5': 'aspect-[4/5]',
  /** No intrinsic ratio; the parent sizes the box (hero backgrounds). */
  fill: '',
}

const FALLBACK_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" fill="none" stroke="#b3c2ab" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">',
  '<path d="M44 34c0 9 7 15 16 15s16-6 16-15l22 10 8 26-18 7v60H32V77l-18-7 8-26 22-10z"/>',
  '</svg>',
].join('')

export const PRODUCT_IMAGE_FALLBACK = `data:image/svg+xml,${encodeURIComponent(FALLBACK_SVG)}`

interface ProductImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  imgClassName?: string
  aspect?: ProductImageAspect
  sizes?: string
  /** Eager-load above-the-fold images. */
  priority?: boolean
  /** Hide from assistive technology when the image repeats visible information. */
  decorative?: boolean
}

/**
 * Lazy, aspect-ratio-locked product image. Broken or missing sources fall back to a
 * neutral garment outline so the layout never shows a browser alt-text box.
 */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  aspect = '3/4',
  sizes,
  priority = false,
  decorative = false,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const useFallback = !src || failedSrc === src
  const resolvedSrc = useFallback ? PRODUCT_IMAGE_FALLBACK : src

  return (
    <div
      className={cn('bg-muted relative overflow-hidden', aspectClasses[aspect], className)}
      aria-hidden={decorative || undefined}
    >
      <img
        src={resolvedSrc}
        alt={decorative ? '' : alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        onError={() => {
          if (src) setFailedSrc(src)
        }}
        className={cn(
          'absolute inset-0 size-full object-cover',
          useFallback && 'object-contain p-[18%] opacity-70',
          imgClassName,
        )}
      />
    </div>
  )
}
