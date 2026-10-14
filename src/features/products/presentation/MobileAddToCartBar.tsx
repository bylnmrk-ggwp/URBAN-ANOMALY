import { ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/domain/entities'

import { PriceDisplay } from './PriceDisplay'

interface MobileAddToCartBarProps {
  product: Product
  canAddToCart: boolean
  onAddToCart: () => void
}

/** Sticky purchase bar for small screens. Offset by `--mobile-nav-height` when the shell sets it. */
export function MobileAddToCartBar({
  product,
  canAddToCart,
  onAddToCart,
}: MobileAddToCartBarProps) {
  return (
    <div className="bg-background/95 fixed inset-x-0 bottom-[var(--mobile-nav-height,0px)] z-30 border-t backdrop-blur lg:hidden">
      <div className="container-x flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <PriceDisplay product={product} size="sm" />
        </div>
        <Button className="min-h-11 shrink-0" disabled={!canAddToCart} onClick={onAddToCart}>
          <ShoppingBag aria-hidden="true" />
          Add to cart
        </Button>
      </div>
    </div>
  )
}
