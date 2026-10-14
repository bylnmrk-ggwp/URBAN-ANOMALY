import type { Product } from '@/features/products/domain/entities'
import { cn } from '@/lib/utils'

import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from './ProductCardSkeleton'

interface ProductGridProps {
  products?: Product[]
  isLoading?: boolean
  skeletonCount?: number
  /** Number of leading cards whose images load eagerly. */
  priorityCount?: number
  className?: string
}

export function ProductGrid({
  products = [],
  isLoading = false,
  skeletonCount = 8,
  priorityCount = 0,
  className,
}: ProductGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10',
        className,
      )}
      aria-busy={isLoading || undefined}
    >
      {isLoading
        ? Array.from({ length: skeletonCount }, (_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < priorityCount} />
          ))}
    </div>
  )
}
