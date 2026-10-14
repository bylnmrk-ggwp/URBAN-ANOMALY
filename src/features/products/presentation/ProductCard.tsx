import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/domain/entities'
import { getPrimaryImage, getProductBadge, uniqueColors } from '@/features/products/domain/rules'
import { ProductCardRating } from '@/features/reviews/presentation/ProductCardRating'
import { WishlistToggle } from '@/features/wishlist/presentation/WishlistToggle'
import { cn } from '@/lib/utils'

import { storefrontButton } from './buttonStyles'
import { PriceDisplay } from './PriceDisplay'
import { ProductBadgePill } from './ProductBadgePill'

const MAX_VISIBLE_COLORS = 5

/** Media zoom shared by both card images so the crossfade and the scale stay in sync. */
const MEDIA_IMG_CLASS =
  'transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100'

interface ProductCardProps {
  product: Product
  /** Eager-load the image for above-the-fold cards. */
  priority?: boolean
  /** Render the full-width "Choose options" button under the card (default true). */
  showQuickAction?: boolean
  className?: string
}

export function ProductCard({
  product,
  priority = false,
  showQuickAction = true,
  className,
}: ProductCardProps) {
  const primary = getPrimaryImage(product)
  const secondary = product.images.find((image) => image.id !== primary?.id) ?? null
  const badge = getProductBadge(product)
  const colors = uniqueColors(product)
  const visibleColors = colors.slice(0, MAX_VISIBLE_COLORS)
  const hiddenColorCount = colors.length - visibleColors.length
  const href = routes.product(product.slug)

  return (
    <div className={cn('group relative flex h-full flex-col', className)}>
      {/* Sibling of the link, not a child: a button inside an anchor is invalid markup. */}
      <WishlistToggle product={product} className="absolute top-2 right-2 z-10" />
      {/* Bottom margin keeps a gap above the quick action, which is pushed to the card's foot. */}
      <Link to={href} className="mb-4 block rounded-lg outline-offset-4">
        <div className="relative overflow-hidden rounded-lg">
          <ProductImage
            src={primary?.url}
            alt={primary?.alt || product.name}
            aspect="square"
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            imgClassName={MEDIA_IMG_CLASS}
          />
          {secondary ? (
            <ProductImage
              src={secondary.url}
              alt=""
              decorative
              aspect="square"
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 motion-reduce:transition-none"
              imgClassName={MEDIA_IMG_CLASS}
            />
          ) : null}
          {badge ? <ProductBadgePill badge={badge} className="absolute top-3 left-3" /> : null}
        </div>

        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <h3 className="text-sm leading-snug font-medium">{product.name}</h3>
          <PriceDisplay product={product} size="sm" className="justify-center" />
          <ProductCardRating productId={product.id} />
          {colors.length > 0 ? (
            <div
              className="flex items-center justify-center gap-1.5 pt-1"
              aria-label={`Available in ${colors.length === 1 ? '1 color' : `${colors.length} colors`}: ${colors
                .map((color) => color.name)
                .join(', ')}`}
            >
              {visibleColors.map((color) => (
                <span
                  key={color.name}
                  className="border-border size-3 rounded-full border"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
              ))}
              {hiddenColorCount > 0 ? (
                <span className="text-muted-foreground text-xs" aria-hidden="true">
                  +{hiddenColorCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      {showQuickAction ? (
        <Button asChild variant="outline" className={storefrontButton('mt-auto min-h-11 w-full')}>
          <Link to={href} aria-label={`Choose options for ${product.name}`}>
            Choose options
          </Link>
        </Button>
      ) : null}
    </div>
  )
}
