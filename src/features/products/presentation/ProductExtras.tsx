import { useEffect } from 'react'

import type { Product } from '@/features/products/domain/entities'
import { BackInStockForm } from '@/features/stock-alerts/presentation/BackInStockForm'
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore'

import { CompleteTheLookSection } from './CompleteTheLookSection'
import { RecentlyViewedSection } from './RecentlyViewedSection'
import type { ProductSelection } from './useProductSelection'

interface ProductExtrasProps {
  product: Product
  selection: ProductSelection
}

/** Product-page slot: back-in-stock form, "complete the look" and the recently viewed trail. */
export function ProductExtras({ product, selection }: ProductExtrasProps) {
  const record = useRecentlyViewedStore((state) => state.record)

  useEffect(() => {
    record(product.id)
  }, [product.id, record])

  const soldOutVariant = selection.variant && selection.available === 0 ? selection.variant : null

  return (
    <>
      {soldOutVariant ? (
        <div className="mt-12 lg:mt-16">
          <BackInStockForm product={product} variant={soldOutVariant} />
        </div>
      ) : null}
      <CompleteTheLookSection product={product} />
      <RecentlyViewedSection excludeProductId={product.id} />
    </>
  )
}
