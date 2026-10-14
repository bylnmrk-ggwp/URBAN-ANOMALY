import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { ProductFilters } from '../domain/entities'

const CATALOG_STALE_TIME = 60_000

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.published(filters),
    queryFn: () => repositories.products.getPublishedProducts(filters),
    placeholderData: keepPreviousData,
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.bySlug(slug ?? ''),
    queryFn: () => repositories.products.getProductBySlug(slug ?? ''),
    enabled: Boolean(slug),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: [...queryKeys.products.featured, limit] as const,
    queryFn: () => repositories.products.getFeaturedProducts(limit),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useNewArrivals(limit = 8) {
  return useQuery({
    queryKey: [...queryKeys.products.all, 'new-arrivals', limit] as const,
    queryFn: () => repositories.products.getNewArrivals(limit),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useBestSellers(limit = 8) {
  return useQuery({
    queryKey: [...queryKeys.products.all, 'best-sellers', limit] as const,
    queryFn: () => repositories.products.getBestSellers(limit),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useRelatedProducts(productId: string | undefined, limit = 4) {
  return useQuery({
    queryKey: [...queryKeys.products.related(productId ?? ''), limit] as const,
    queryFn: () => repositories.products.getRelatedProducts(productId ?? '', limit),
    enabled: Boolean(productId),
    staleTime: CATALOG_STALE_TIME,
  })
}

/** Resolves catalog products for a set of ids. Used to hydrate the cart from trusted data. */
export function useProductsByIds(ids: string[]) {
  const sortedIds = [...ids].sort()
  return useQuery({
    queryKey: [...queryKeys.products.all, 'by-ids', sortedIds] as const,
    queryFn: () => repositories.products.getProductsByIds(sortedIds),
    enabled: sortedIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
