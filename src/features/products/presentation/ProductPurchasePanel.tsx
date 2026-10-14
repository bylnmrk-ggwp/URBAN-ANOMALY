import { ShoppingBag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/domain/entities'
import { WishlistToggle } from '@/features/wishlist/presentation/WishlistToggle'
import { cn } from '@/lib/utils'

import { ColorSwatches } from './ColorSwatches'
import { PriceDisplay } from './PriceDisplay'
import { QuantitySelector } from './QuantitySelector'
import { SizeGuideDialog } from './SizeGuideDialog'
import { SizeSelector } from './SizeSelector'
import type { ProductSelection, StockTone } from './useProductSelection'

const stockToneClasses: Record<StockTone, string> = {
  in_stock: 'text-success',
  low: 'text-warning',
  out: 'text-destructive',
}

interface ProductPurchasePanelProps {
  product: Product
  selection: ProductSelection
  onAddToCart: () => void
}

export function ProductPurchasePanel({
  product,
  selection,
  onAddToCart,
}: ProductPurchasePanelProps) {
  const { size, colorName, quantity, sizes, colors, available, stock, canAddToCart } = selection
  const needsSelection = size === null || colorName === null

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
          {product.categoryName}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{product.name}</h1>
        <PriceDisplay product={product} size="lg" />
        <p className="text-muted-foreground line-clamp-3 leading-relaxed">{product.description}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium" id="color-label">
          Color{colorName ? <span className="text-muted-foreground"> — {colorName}</span> : null}
        </p>
        <ColorSwatches
          product={product}
          colors={colors}
          selected={colorName}
          size={size}
          onChange={selection.setColorName}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium">
            Size{size ? <span className="text-muted-foreground"> — {size}</span> : null}
          </p>
          <SizeGuideDialog onSelectSize={selection.setSize} />
        </div>
        <SizeSelector
          product={product}
          sizes={sizes}
          selected={size}
          colorName={colorName}
          onChange={selection.setSize}
        />
      </div>

      {stock ? (
        <p className={cn('text-sm font-medium', stockToneClasses[stock.tone])} role="status">
          {stock.text}
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="text-sm font-medium">Quantity</p>
        <QuantitySelector
          value={quantity}
          max={Math.max(1, available)}
          onChange={selection.setQuantity}
          disabled={!canAddToCart}
        />
      </div>

      <div className="space-y-2">
        <div className="flex gap-3">
          <Button
            size="lg"
            className="min-h-12 flex-1 text-base"
            disabled={!canAddToCart}
            onClick={onAddToCart}
          >
            <ShoppingBag aria-hidden="true" />
            {stock?.tone === 'out' && !needsSelection ? 'Out of stock' : 'Add to cart'}
          </Button>
          <WishlistToggle product={product} variant="inline" />
        </div>
        {needsSelection ? (
          <p className="text-muted-foreground text-center text-sm" id="add-to-cart-hint">
            Select a size and color
          </p>
        ) : null}
      </div>
    </div>
  )
}
