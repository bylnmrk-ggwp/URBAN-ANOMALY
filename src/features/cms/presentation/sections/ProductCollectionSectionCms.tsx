import type { UseQueryResult } from '@tanstack/react-query'
import { Footprints } from 'lucide-react'
import { useMemo } from 'react'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import {
  useBestSellers,
  useFeaturedProducts,
  useNewArrivals,
  useProductsByIds,
} from '@/features/products/application/storefront'
import type { Product } from '@/features/products/domain/entities'
import { ProductCollectionSection } from '@/features/products/presentation/ProductCollectionSection'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { cn } from '@/lib/utils'

import type { SectionOf } from '../../domain/sections'
import type { SectionContext } from './shared'
import { anchorClass, anchorId } from './shared'

type CollectionSection = SectionOf<'product_collection'>

interface CollectionProps {
  section: CollectionSection
  eager: boolean
}

function CollectionBody({
  section,
  eager,
  query,
}: CollectionProps & { query: UseQueryResult<Product[]> }) {
  const body = (
    <ProductCollectionSection
      eyebrow={section.eyebrow || undefined}
      title={section.title}
      query={query}
      viewAllHref={section.viewAllHref || routes.shop}
      priorityCount={eager ? 4 : 0}
    />
  )
  // The shared section owns its <section>; only anchored instances need a wrapper for the id.
  return section.anchor ? (
    <div id={anchorId(section)} className={anchorClass(section)}>
      {body}
    </div>
  ) : (
    body
  )
}

function NewArrivalsCollection(props: CollectionProps) {
  return <CollectionBody {...props} query={useNewArrivals(props.section.limit)} />
}

function BestSellersCollection(props: CollectionProps) {
  return <CollectionBody {...props} query={useBestSellers(props.section.limit)} />
}

function FeaturedCollection(props: CollectionProps) {
  return <CollectionBody {...props} query={useFeaturedProducts(props.section.limit)} />
}

function ManualCollection(props: CollectionProps) {
  const { productIds, limit } = props.section
  const raw = useProductsByIds(productIds)
  const ordered = useMemo(() => {
    if (!raw.data) return raw.data
    const byId = new Map(raw.data.map((product) => [product.id, product]))
    return productIds
      .flatMap((id) => {
        const product = byId.get(id)
        return product ? [product] : []
      })
      .slice(0, limit)
  }, [raw.data, productIds, limit])
  const query = { ...raw, data: ordered } as UseQueryResult<Product[]>
  return <CollectionBody {...props} query={query} />
}

/** Manual collections with nothing picked yet: the hook stays idle, so show the empty state directly. */
function EmptyCollection({ section }: { section: CollectionSection }) {
  return (
    <section
      id={anchorId(section)}
      className={cn('container-x py-16 lg:py-24', anchorClass(section))}
    >
      <SectionHeading eyebrow={section.eyebrow || undefined} title={section.title} align="center" />
      <EmptyState
        icon={Footprints}
        title="No products selected."
        description="Pick products for this collection in the editor."
      />
    </section>
  )
}

export function ProductCollectionSectionCms({
  section,
  context,
}: {
  section: CollectionSection
  context: SectionContext
}) {
  const props = { section, eager: context.eager }
  switch (section.source) {
    case 'new_arrivals':
      return <NewArrivalsCollection {...props} />
    case 'best_sellers':
      return <BestSellersCollection {...props} />
    case 'featured':
      return <FeaturedCollection {...props} />
    case 'manual':
      return section.productIds.length === 0 ? (
        <EmptyCollection section={section} />
      ) : (
        <ManualCollection {...props} />
      )
  }
}
