import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { AdminReviewFilters, ReviewInput, ReviewStatus } from '../domain/entities'

const REVIEW_STALE_TIME = 60_000

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviews.product(productId ?? ''),
    queryFn: () => repositories.reviews.listForProduct(productId ?? ''),
    enabled: Boolean(productId),
    staleTime: REVIEW_STALE_TIME,
  })
}

/** Cheap enough to run once per product card in mock mode. */
export function useReviewSummary(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviews.summary(productId ?? ''),
    queryFn: () => repositories.reviews.getSummary(productId ?? ''),
    enabled: Boolean(productId),
    staleTime: REVIEW_STALE_TIME,
  })
}

function useInvalidateReviews() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all })
}

export function useSubmitReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: (input: ReviewInput) => repositories.reviews.submit(input),
    onSuccess: invalidate,
  })
}

export function useAdminReviews(filters: AdminReviewFilters) {
  return useQuery({
    queryKey: queryKeys.reviews.admin(filters),
    queryFn: () => repositories.reviews.listAdmin(filters),
  })
}

export function useSetReviewStatus() {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      repositories.reviews.setStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteReview() {
  const invalidate = useInvalidateReviews()
  return useMutation({
    mutationFn: (id: string) => repositories.reviews.remove(id),
    onSuccess: invalidate,
  })
}
