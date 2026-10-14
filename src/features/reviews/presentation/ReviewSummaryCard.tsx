import type { ReviewSummary } from '@/features/reviews/domain/entities'
import { pluralize } from '@/lib/format'

import { StarRating } from './StarRating'

interface ReviewSummaryCardProps {
  summary: ReviewSummary
}

export function ReviewSummaryCard({ summary }: ReviewSummaryCardProps) {
  const average = summary.count === 0 ? 0 : summary.average

  return (
    <div className="grid gap-8 rounded-md border p-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="text-center sm:pr-8 sm:text-left">
        <p className="text-5xl font-semibold tracking-tight tabular-nums">{average.toFixed(1)}</p>
        <StarRating value={average} size="lg" className="mt-2" />
        <p className="text-muted-foreground mt-2 text-sm">
          Based on {pluralize(summary.count, 'review')}
        </p>
      </div>

      <dl className="space-y-2" aria-label="Rating distribution">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.distribution[stars - 1] ?? 0
          const percent = summary.count === 0 ? 0 : Math.round((count / summary.count) * 100)
          return (
            <div key={stars} className="flex items-center gap-3 text-sm">
              <dt className="w-14 shrink-0 whitespace-nowrap tabular-nums">
                {stars} star{stars === 1 ? '' : 's'}
              </dt>
              <dd className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="bg-muted h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                  aria-hidden="true"
                >
                  <div
                    className="bg-foreground h-full rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
                  {percent}%
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
