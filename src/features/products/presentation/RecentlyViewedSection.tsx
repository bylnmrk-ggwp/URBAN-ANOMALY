import { useProductsByIds } from '@/features/products/application/storefront'
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore'

import { ProductGrid } from './ProductGrid'
import { SectionHeading } from './SectionHeading'

interface RecentlyViewedSectionProps {
  /** Product currently on screen; never shown in its own trail. */
  excludeProductId: string
}

export function RecentlyViewedSection({ excludeProductId }: RecentlyViewedSectionProps) {
  const ids = useRecentlyViewedStore((state) => state.items).filter((id) => id !== excludeProductId)
  const query = useProductsByIds(ids)

  if (ids.length === 0) return null

  const products = query.data
    ? [...query.data].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    : []
  if (!query.isPending && products.length === 0) return null

  return (
    <section className="mt-20 lg:mt-28" aria-labelledby="recently-viewed-title">
      <SectionHeading title="Recently viewed" />
      <h2 id="recently-viewed-title" className="sr-only">
        Recently viewed
      </h2>
      <ProductGrid
        products={products}
        isLoading={query.isPending}
        skeletonCount={Math.min(ids.length, 4)}
      />
    </section>
  )
}
