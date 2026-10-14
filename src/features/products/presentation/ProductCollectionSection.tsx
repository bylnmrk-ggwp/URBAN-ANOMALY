import type { UseQueryResult } from '@tanstack/react-query'
import { Shirt } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/domain/entities'

import { storefrontButton } from './buttonStyles'
import { ProductCarousel } from './ProductCarousel'
import { ProductGrid } from './ProductGrid'
import { SectionHeading } from './SectionHeading'

interface ProductCollectionSectionProps {
  title: string
  eyebrow?: string
  description?: string
  query: UseQueryResult<Product[]>
  viewAllHref: string
  viewAllLabel?: string
  skeletonCount?: number
  /** Eager-load the first N card images (for the first section on the page). */
  priorityCount?: number
  /** `carousel` (default) is the Spotlight slider; `grid` is the static shop layout. */
  layout?: 'grid' | 'carousel'
}

export function ProductCollectionSection({
  title,
  eyebrow,
  description,
  query,
  viewAllHref,
  viewAllLabel = 'View all',
  skeletonCount = 8,
  priorityCount = 0,
  layout = 'carousel',
}: ProductCollectionSectionProps) {
  const products = query.data ?? []
  const carousel = layout === 'carousel'

  return (
    <section className="container-x py-16 lg:py-24">
      <SectionHeading
        title={title}
        eyebrow={eyebrow}
        description={description}
        align="center"
        action={
          <Button asChild variant="outline" className={storefrontButton('min-h-11 px-8')}>
            <Link to={viewAllHref}>{viewAllLabel}</Link>
          </Button>
        }
      />
      <Reveal effect="fade">
        {query.isPending ? (
          carousel ? (
            <ProductCarousel isLoading skeletonCount={Math.min(skeletonCount, 4)} label={title} />
          ) : (
            <ProductGrid isLoading skeletonCount={skeletonCount} />
          )
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title="Products are coming soon."
            description="We're stocking the shelves. Check back shortly."
          />
        ) : carousel ? (
          <ProductCarousel products={products} priorityCount={priorityCount} label={title} />
        ) : (
          <ProductGrid products={products} priorityCount={priorityCount} />
        )}
      </Reveal>
    </section>
  )
}
