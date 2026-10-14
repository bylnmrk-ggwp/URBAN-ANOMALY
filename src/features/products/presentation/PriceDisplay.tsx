import type { Product } from '@/features/products/domain/entities'
import { getDisplayPrice, isOnSale } from '@/features/products/domain/rules'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

type PriceSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<PriceSize, { current: string; original: string }> = {
  sm: { current: 'text-sm', original: 'text-xs' },
  md: { current: 'text-base', original: 'text-sm' },
  lg: { current: 'text-2xl', original: 'text-base' },
}

interface PriceDisplayProps {
  product: Pick<Product, 'basePrice' | 'salePrice'>
  size?: PriceSize
  className?: string
}

export function PriceDisplay({ product, size = 'md', className }: PriceDisplayProps) {
  const onSale = isOnSale(product)
  const classes = sizeClasses[size]

  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-medium tabular-nums', classes.current)}>
        {onSale ? <span className="sr-only">Sale price </span> : null}
        {formatPrice(getDisplayPrice(product))}
      </span>
      {onSale ? (
        <s className={cn('text-muted-foreground tabular-nums', classes.original)}>
          <span className="sr-only">Original price </span>
          {formatPrice(product.basePrice)}
        </s>
      ) : null}
    </p>
  )
}
