import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/features/products/application/storefront'
import { pickCompleteTheLook } from '@/features/products/domain/completeTheLook'
import type { Product } from '@/features/products/domain/entities'

import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { SectionHeading } from './SectionHeading'

const CANDIDATE_POOL_SIZE = 24
const LOOK_SIZE = 4

interface CompleteTheLookSectionProps {
  product: Product
}

/**
 * Pairs the current pair with items from complementary categories (clogs with straps, etc.;
 * see `pickCompleteTheLook`). Cards carry no variant selection, so the quick action opens the
 * product page where size and colour are chosen.
 */
export function CompleteTheLookSection({ product }: CompleteTheLookSectionProps) {
  const pool = useProducts({ pageSize: CANDIDATE_POOL_SIZE, sort: 'best_selling' })
  const picks = pool.data ? pickCompleteTheLook(product, pool.data.items, LOOK_SIZE) : []

  if (!pool.isPending && picks.length === 0) return null

  return (
    <section className="mt-20 lg:mt-28" aria-labelledby="complete-the-look-title">
      <SectionHeading
        eyebrow="Styled with"
        title="Complete the look"
        description={`Pieces that pair well with the ${product.name}.`}
      />
      <h2 id="complete-the-look-title" className="sr-only">
        Complete the look
      </h2>
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 lg:gap-x-6 lg:gap-y-10"
        aria-busy={pool.isPending || undefined}
      >
        {pool.isPending
          ? Array.from({ length: LOOK_SIZE }, (_, index) => <ProductCardSkeleton key={index} />)
          : picks.map((pick) => (
              <div key={pick.id} className="flex flex-col gap-3">
                <ProductCard product={pick} showQuickAction={false} />
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link to={routes.product(pick.slug)}>
                    <ShoppingBag aria-hidden="true" />
                    Add to cart
                    <span className="sr-only"> — choose size and colour for {pick.name}</span>
                  </Link>
                </Button>
              </div>
            ))}
      </div>
    </section>
  )
}
