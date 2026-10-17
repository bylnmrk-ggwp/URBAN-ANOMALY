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
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#b3c2ab" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">',
  '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/>',
  '<path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/>',
  '<path d="M16 17h4"/>',
  '<path d="M4 13h4"/>',
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
 * neutral footprint outline so the layout never shows a browser alt-text box.
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
