import { Shirt } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { BRAND_NAME } from '@/components/layout/storefrontNav'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/application/useCart'
import { useProductBySlug, useRelatedProducts } from '@/features/products/application/storefront'
import { MobileAddToCartBar } from '@/features/products/presentation/MobileAddToCartBar'
import { ProductDetailsAccordion } from '@/features/products/presentation/ProductDetailsAccordion'
import { ProductDetailsSkeleton } from '@/features/products/presentation/ProductDetailsSkeleton'
import { ProductExtras } from '@/features/products/presentation/ProductExtras'
import { ProductGallery } from '@/features/products/presentation/ProductGallery'
import { ProductGrid } from '@/features/products/presentation/ProductGrid'
import { ProductPurchasePanel } from '@/features/products/presentation/ProductPurchasePanel'
import { ProductReviews } from '@/features/reviews/presentation/ProductReviews'
import { SectionHeading } from '@/features/products/presentation/SectionHeading'
import { useProductSelection } from '@/features/products/presentation/useProductSelection'
import { useStoreSettings } from '@/features/settings/application/hooks'

/** Agent C: SEO meta. Writes document.title + meta[name=description] with per-product overrides. */
function useProductSeo(
  product: { name: string; description: string; seoTitle: string; seoDescription: string } | null,
) {
  const settings = useStoreSettings()
  const storeName = settings.data?.storeName
  useEffect(() => {
    if (!product || typeof document === 'undefined') return
    const previousTitle = document.title
    document.title = product.seoTitle || `${product.name} — ${storeName ?? BRAND_NAME}`
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    const previousDescription = meta.content
    meta.content = product.seoDescription || product.description.slice(0, 160)
    return () => {
      document.title = previousTitle
      if (created) meta?.remove()
      else if (meta) meta.content = previousDescription
    }
  }, [product, storeName])
}

export default function ProductDetailsPage() {
  const { slug } = useParams<{ slug: string }>()
  const productQuery = useProductBySlug(slug)
  const product = productQuery.data ?? null
  useProductSeo(product)
  const related = useRelatedProducts(product?.id, 4)
  const selection = useProductSelection(product)
  const { addItem } = useCart()

  const handleAddToCart = () => {
    if (!product || !selection.variant || !selection.canAddToCart) return
    addItem(product, selection.variant, selection.quantity)
    selection.resetQuantity()
  }

  if (productQuery.isPending) {
    return (
      <div className="container-x py-12 lg:py-16">
        <ProductDetailsSkeleton />
      </div>
    )
  }

  if (productQuery.isError) {
    return (
      <div className="container-x py-16">
        <ErrorState
          error={productQuery.error}
          onRetry={() => void productQuery.refetch()}
          isRetrying={productQuery.isFetching}
        />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-x py-16 lg:py-24">
        <EmptyState
          icon={Shirt}
          title="Product not found"
          description="This item may have sold out for good or moved to a new address."
          action={
            <Button asChild className="min-h-11">
              <Link to={routes.shop}>Back to shop</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-x py-8 pb-28 lg:py-12 lg:pb-16">
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={routes.home}>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={routes.shop}>Shop</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={routes.collection(product.categorySlug)}>{product.categoryName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery images={product.images} productName={product.name} />
        </div>
        <div className="space-y-10">
          <ProductPurchasePanel
            product={product}
            selection={selection}
            onAddToCart={handleAddToCart}
          />
          <ProductDetailsAccordion product={product} />
        </div>
      </div>

      {related.isPending || (related.data && related.data.length > 0) ? (
        <section className="mt-20 lg:mt-28">
          <SectionHeading title="You may also like" />
          <ProductGrid products={related.data} isLoading={related.isPending} skeletonCount={4} />
        </section>
      ) : null}
      <ProductExtras product={product} selection={selection} />
      <ProductReviews product={product} />

      <MobileAddToCartBar
        product={product}
        canAddToCart={selection.canAddToCart}
        onAddToCart={handleAddToCart}
      />
    </div>
  )
}
