import { useReviewSummary } from '@/features/reviews/application/hooks'

import { StarRating } from './StarRating'

interface ProductCardRatingProps {
  productId: string
}

/** Stars + count under the price on product cards. Renders nothing until there is a rating. */
export function ProductCardRating({ productId }: ProductCardRatingProps) {
  const summary = useReviewSummary(productId)
  if (!summary.data || summary.data.count === 0) return null

  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <StarRating value={summary.data.average} size="sm" />
      <span className="text-muted-foreground text-xs tabular-nums">({summary.data.count})</span>
    </div>
  )
}
