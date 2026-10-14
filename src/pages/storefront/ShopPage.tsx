import { Search, Shirt } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories } from '@/features/categories/application/hooks'
import { MarkdownBlocks } from '@/features/cms/presentation/MarkdownBlocks'
import { useProducts } from '@/features/products/application/storefront'
import type {
  ProductColor,
  ProductFilters as CatalogFilters,
  ProductSize,
} from '@/features/products/domain/entities'
import { PRODUCT_SIZES } from '@/features/products/domain/entities'
import { uniqueColors } from '@/features/products/domain/rules'
import { ProductFilters } from '@/features/products/presentation/ProductFilters'
import type { ProductFilterValues } from '@/features/products/presentation/ProductFilters'
import { ProductGrid } from '@/features/products/presentation/ProductGrid'
import { ProductSort } from '@/features/products/presentation/ProductSort'
import { isProductSort } from '@/features/products/presentation/productSortOptions'
import { ShopPagination } from '@/features/products/presentation/ShopPagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { pluralize } from '@/lib/format'

const PAGE_SIZE = 12

function isProductSize(value: string): value is ProductSize {
  return (PRODUCT_SIZES as readonly string[]).includes(value)
}

function parseList(raw: string | null): string[] {
  return raw ? raw.split(',').filter(Boolean) : []
}

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const categories = useCategories()

  const q = searchParams.get('q') ?? ''
  const sortParam = searchParams.get('sort')
  const sort = isProductSort(sortParam) ? sortParam : 'newest'
  const page = Math.max(1, parseNumber(searchParams.get('page')) ?? 1)
  const filterValues: ProductFilterValues = {
    categorySlug: slug ?? searchParams.get('category'),
    sizes: parseList(searchParams.get('sizes')).filter(isProductSize),
    colors: parseList(searchParams.get('colors')),
    minPrice: parseNumber(searchParams.get('min')),
    maxPrice: parseNumber(searchParams.get('max')),
  }

  const [searchInput, setSearchInput] = useState(q)
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300)

  const updateParams = (patch: Record<string, string | null>, resetPage = true) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key)
          else next.set(key, value)
        }
        if (resetPage) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (debouncedSearch !== q) updateParams({ q: debouncedSearch || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value
  }, [debouncedSearch])

  const catalogFilters: CatalogFilters = {
    search: q || undefined,
    categorySlug: filterValues.categorySlug ?? undefined,
    sizes: filterValues.sizes.length > 0 ? filterValues.sizes : undefined,
    colors: filterValues.colors.length > 0 ? filterValues.colors : undefined,
    minPrice: filterValues.minPrice ?? undefined,
    maxPrice: filterValues.maxPrice ?? undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  }
  const products = useProducts(catalogFilters)
  const result = products.data

  // Accumulate colours seen so the filter list does not shrink while a colour is selected.
  const [seenColors, setSeenColors] = useState<Map<string, ProductColor>>(new Map())
  const [seenResult, setSeenResult] = useState(result)
  if (result && result !== seenResult) {
    setSeenResult(result)
    const next = new Map(seenColors)
    for (const product of result.items) {
      for (const color of uniqueColors(product))
        if (!next.has(color.name)) next.set(color.name, color)
    }
    if (next.size !== seenColors.size) setSeenColors(next)
  }
  const availableColors = useMemo(
    () => [...seenColors.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [seenColors],
  )

  const onFilterChange = (patch: Partial<ProductFilterValues>) => {
    const params: Record<string, string | null> = {}
    if ('categorySlug' in patch) params.category = patch.categorySlug ?? null
    if (patch.sizes) params.sizes = patch.sizes.join(',') || null
    if (patch.colors) params.colors = patch.colors.join(',') || null
    if ('minPrice' in patch) params.min = patch.minPrice?.toString() ?? null
    if ('maxPrice' in patch) params.max = patch.maxPrice?.toString() ?? null
    updateParams(params)
  }

  const clearFilters = () => {
    setSearchInput('')
    updateParams({ q: null, category: null, sizes: null, colors: null, min: null, max: null })
  }

  const activeCount =
    (filterValues.categorySlug && !slug ? 1 : 0) +
    (filterValues.sizes.length > 0 ? 1 : 0) +
    (filterValues.colors.length > 0 ? 1 : 0) +
    (filterValues.minPrice !== null || filterValues.maxPrice !== null ? 1 : 0)

  const buildHref = (target: number) => {
    const next = new URLSearchParams(searchParams)
    if (target <= 1) next.delete('page')
    else next.set('page', String(target))
    const query = next.toString()
    const base = slug ? routes.collection(slug) : routes.shop
    return query ? `${base}?${query}` : base
  }

  const collection = slug ? categories.data?.find((category) => category.slug === slug) : undefined
  const collectionMissing = Boolean(slug) && categories.isSuccess && !collection
  const title = collection?.introTitle || collection?.name || (slug ? 'Collection' : 'Shop')
  const introBody = collection?.introBody ?? ''
  const description =
    collection?.description ||
    (q ? `Results for “${q}”` : 'Everyday essentials in natural fabrics.')

  const filterProps = {
    value: filterValues,
    onChange: onFilterChange,
    onClear: clearFilters,
    categories: categories.data ?? [],
    availableColors,
    lockCategory: Boolean(slug),
    activeCount,
  }

  if (collectionMissing) {
    return (
      <div className="container-x py-16 lg:py-24">
        <EmptyState
          icon={Shirt}
          title="Collection not found"
          description="This collection may have been renamed or removed."
          action={
            <Button asChild className="min-h-11">
              <Link to={routes.shop}>Browse all products</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-x py-12 lg:py-16">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{description}</p>
        {introBody ? (
          <MarkdownBlocks
            body={introBody}
            className="text-muted-foreground mt-5 space-y-3 text-base leading-relaxed"
          />
        ) : null}
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="hidden w-64 shrink-0 lg:block">
          <ProductFilters variant="sidebar" {...filterProps} className="sticky top-24" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Label htmlFor="shop-search" className="sr-only">
                Search products
              </Label>
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="shop-search"
                type="search"
                placeholder="Search products"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="min-h-11 pl-9"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="lg:hidden">
                <ProductFilters variant="sheet" {...filterProps} />
              </div>
              <ProductSort value={sort} onChange={(next) => updateParams({ sort: next })} />
            </div>
          </div>

          <p className="text-muted-foreground mb-6 text-sm" role="status" aria-live="polite">
            {result ? pluralize(result.total, 'product') : 'Loading products…'}
          </p>

          {products.isError ? (
            <ErrorState
              error={products.error}
              onRetry={() => void products.refetch()}
              isRetrying={products.isFetching}
            />
          ) : products.isPending ? (
            <ProductGrid isLoading skeletonCount={PAGE_SIZE} className="lg:grid-cols-3" />
          ) : result && result.items.length === 0 ? (
            <EmptyState
              icon={Shirt}
              title="No products match your filters."
              description="Try removing a filter or searching for something else."
              action={
                <Button variant="outline" className="min-h-11" onClick={clearFilters}>
                  Clear all filters
                </Button>
              }
            />
          ) : result ? (
            <div
              className={products.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
            >
              <ProductGrid products={result.items} priorityCount={4} className="lg:grid-cols-3" />
              <ShopPagination
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={(target) => {
                  updateParams({ page: target > 1 ? String(target) : null }, false)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                buildHref={buildHref}
                className="mt-12"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
