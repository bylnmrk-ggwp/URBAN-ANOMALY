import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/application/useAuth'
import type { Product } from '@/features/products/domain/entities'
import { useProductReviews, useReviewSummary } from '@/features/reviews/application/hooks'

import { ReviewForm } from './ReviewForm'
import { ReviewList } from './ReviewList'
import { ReviewSummaryCard } from './ReviewSummaryCard'

interface ProductReviewsProps {
  product: Product
}

/** Storefront reviews section: summary, approved reviews and the "write a review" entry point. */
export function ProductReviews({ product }: ProductReviewsProps) {
  const { user } = useAuth()
  const location = useLocation()
  const reviews = useProductReviews(product.id)
  const summary = useReviewSummary(product.id)
  const [formOpen, setFormOpen] = useState(false)

  const writeButton = user ? (
    <Button variant="outline" className="min-h-11" onClick={() => setFormOpen(true)}>
      Write a review
    </Button>
  ) : (
    <Button asChild variant="outline" className="min-h-11">
      <Link to={routes.login} state={{ from: location }}>
        Sign in to write a review
      </Link>
    </Button>
  )

  return (
    <section className="mt-20 lg:mt-28" aria-labelledby="reviews-heading" id="reviews">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Reviews
        </h2>
        {writeButton}
      </div>

      {reviews.isPending || summary.isPending ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading reviews">
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reviews.isError || summary.isError ? (
        <ErrorState
          title="Could not load reviews"
          error={reviews.error ?? summary.error}
          onRetry={() => {
            void reviews.refetch()
            void summary.refetch()
          }}
          isRetrying={reviews.isFetching || summary.isFetching}
        />
      ) : reviews.data.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet. Be the first."
          description="Share how it fits and feels to help other shoppers decide."
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <ReviewSummaryCard summary={summary.data} />
          </div>
          <ReviewList reviews={reviews.data} />
        </div>
      )}

      {user ? <ReviewForm product={product} open={formOpen} onOpenChange={setFormOpen} /> : null}
    </section>
  )
}
