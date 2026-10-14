import { Heart } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { useProductsByIds } from '@/features/products/application/storefront'
import { ProductGrid } from '@/features/products/presentation/ProductGrid'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { useWishlist } from '@/features/wishlist/application/useWishlist'
import { pluralize } from '@/lib/format'

/** Works for guests and signed-in buyers alike: the list lives in the browser. */
export default function WishlistPage() {
  const { ids, count } = useWishlist()
  const query = useProductsByIds(ids)

  // Keep the saved order (newest last) rather than the catalog's order.
  const products = query.data
    ? [...query.data].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    : []

  return (
    <div className="container-x py-12 lg:py-16">
      <SectionHeading
        as="h1"
        eyebrow="Saved for later"
        title="Wishlist"
        description={
          count > 0
            ? `${pluralize(count, 'item')} saved on this device.`
            : 'Tap the heart on any product to save it here.'
        }
      />

      {ids.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty."
          description="Save pieces you love and come back to them anytime."
          action={
            <Button asChild className="min-h-11">
              <Link to={routes.shop}>Browse the shop</Link>
            </Button>
          }
        />
      ) : query.isError ? (
        <ErrorState
          title="Could not load your wishlist"
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <ProductGrid
          products={products}
          isLoading={query.isPending}
          skeletonCount={Math.min(ids.length, 8)}
          priorityCount={4}
        />
      )}
    </div>
  )
}
