import { useCallback } from 'react'

import type { Product } from '@/features/products/domain/entities'
import { useCartStore } from '@/stores/cartStore'
import { selectWishlistCount, useWishlistStore } from '@/stores/wishlistStore'

/** Wishlist state plus a toggle that announces the change to screen readers. */
export function useWishlist() {
  const ids = useWishlistStore((state) => state.items)
  const count = useWishlistStore(selectWishlistCount)
  const storeToggle = useWishlistStore((state) => state.toggle)
  const storeRemove = useWishlistStore((state) => state.remove)
  const announce = useCartStore((state) => state.announce)

  const has = useCallback((productId: string) => ids.includes(productId), [ids])

  const toggle = useCallback(
    (product: Pick<Product, 'id' | 'name'>) => {
      const added = storeToggle(product.id)
      announce(
        added
          ? `Added ${product.name} to your wishlist`
          : `Removed ${product.name} from your wishlist`,
      )
      return added
    },
    [storeToggle, announce],
  )

  const remove = useCallback(
    (product: Pick<Product, 'id' | 'name'>) => {
      storeRemove(product.id)
      announce(`Removed ${product.name} from your wishlist`)
    },
    [storeRemove, announce],
  )

  return { ids, count, has, toggle, remove, isEmpty: ids.length === 0 }
}
