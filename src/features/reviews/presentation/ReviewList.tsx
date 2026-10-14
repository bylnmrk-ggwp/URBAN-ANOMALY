import { useState } from 'react'

import { StatusBadge } from '@/components/common/StatusBadge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Review } from '@/features/reviews/domain/entities'
import { formatDate } from '@/lib/format'

import { StarRating } from './StarRating'

interface ReviewListProps {
  reviews: Review[]
}

interface Lightbox {
  review: Review
  index: number
}

export function ReviewList({ reviews }: ReviewListProps) {
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)
  const openUrl = lightbox ? lightbox.review.photoUrls[lightbox.index] : undefined

  return (
    <>
      <ul className="divide-border divide-y">
        {reviews.map((review) => (
          <li key={review.id} className="space-y-3 py-8 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <StarRating value={review.rating} size="sm" />
              <h3 className="text-base font-medium">{review.title}</h3>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-foreground">{review.authorName}</span>
              {review.isVerifiedPurchase ? (
                <StatusBadge label="Verified purchase" tone="success" />
              ) : null}
              <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
            </div>
            <p className="max-w-prose text-sm leading-relaxed whitespace-pre-line">{review.body}</p>
            {review.photoUrls.length > 0 ? (
              <ul className="grid max-w-sm grid-cols-3 gap-2" aria-label="Customer photos">
                {review.photoUrls.map((url, index) => (
                  <li key={url} className="min-w-0">
                    <button
                      type="button"
                      className="bg-muted focus-visible:ring-ring/50 block aspect-square w-full overflow-hidden rounded-md outline-none focus-visible:ring-[3px]"
                      onClick={() => setLightbox({ review, index })}
                      aria-label={`Open photo ${index + 1} of ${review.photoUrls.length} from ${review.authorName}`}
                    >
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-2 sm:max-w-2xl">
          <DialogTitle className="sr-only">
            {lightbox ? `Photo from ${lightbox.review.authorName}` : 'Photo'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {lightbox
              ? `Photo ${lightbox.index + 1} of ${lightbox.review.photoUrls.length} attached to the review "${lightbox.review.title}".`
              : ''}
          </DialogDescription>
          {openUrl ? (
            <img
              src={openUrl}
              alt={lightbox ? `Customer photo for ${lightbox.review.title}` : ''}
              className="max-h-[80dvh] w-full rounded-sm object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
