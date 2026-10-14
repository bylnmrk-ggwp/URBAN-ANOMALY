import { Check, Trash2, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import type { StatusTone } from '@/features/orders/domain/rules'
import type { Review, ReviewStatus } from '@/features/reviews/domain/entities'
import { REVIEW_STATUS_LABELS } from '@/features/reviews/domain/entities'
import { formatDate } from '@/lib/format'

import { StarRating } from '../StarRating'

const STATUS_TONE: Record<ReviewStatus, StatusTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <StatusBadge label={REVIEW_STATUS_LABELS[status]} tone={STATUS_TONE[status]} />
}

interface ReviewsTableProps {
  reviews: Review[]
  isLoading: boolean
  emptyState: ReactNode
  pendingId: string | null
  onApprove: (review: Review) => void
  onReject: (review: Review) => void
  onDelete: (review: Review) => void
}

function excerpt(body: string, max = 90) {
  return body.length > max ? `${body.slice(0, max).trimEnd()}…` : body
}

function Photos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <ul className="flex gap-1" aria-label={`${urls.length} photo${urls.length === 1 ? '' : 's'}`}>
      {urls.map((url) => (
        <li key={url} className="bg-muted size-9 shrink-0 overflow-hidden rounded-sm">
          <img src={url} alt="" loading="lazy" className="size-full object-cover" />
        </li>
      ))}
    </ul>
  )
}

function Actions({
  review,
  busy,
  onApprove,
  onReject,
  onDelete,
}: Pick<ReviewsTableProps, 'onApprove' | 'onReject' | 'onDelete'> & {
  review: Review
  busy: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {review.status !== 'approved' ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onApprove(review)}>
          <Check aria-hidden="true" />
          Approve
        </Button>
      ) : null}
      {review.status !== 'rejected' ? (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => onReject(review)}>
          <X aria-hidden="true" />
          Reject
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={busy}
        onClick={() => onDelete(review)}
        aria-label={`Delete review "${review.title}"`}
      >
        <Trash2 aria-hidden="true" />
        Delete
      </Button>
    </div>
  )
}

export function ReviewsTable({
  reviews,
  isLoading,
  emptyState,
  pendingId,
  onApprove,
  onReject,
  onDelete,
}: ReviewsTableProps) {
  const actionProps = { onApprove, onReject, onDelete }
  const columns: DataTableColumn<Review>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (r) => (
        <Link to={routes.product(r.productSlug)} className="font-medium hover:underline">
          {r.productName}
        </Link>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate">{r.authorName}</p>
          {r.isVerifiedPurchase ? <p className="text-success text-xs">Verified purchase</p> : null}
        </div>
      ),
      hideBelow: 'lg',
    },
    { key: 'rating', header: 'Rating', cell: (r) => <StarRating value={r.rating} size="sm" /> },
    {
      key: 'review',
      header: 'Review',
      cell: (r) => (
        <div className="max-w-xs min-w-0">
          <p className="truncate font-medium">{r.title}</p>
          <p className="text-muted-foreground line-clamp-2 text-xs">{excerpt(r.body)}</p>
        </div>
      ),
    },
    {
      key: 'photos',
      header: 'Photos',
      cell: (r) => <Photos urls={r.photoUrls} />,
      hideBelow: 'lg',
    },
    { key: 'status', header: 'Status', cell: (r) => <ReviewStatusBadge status={r.status} /> },
    {
      key: 'date',
      header: 'Date',
      cell: (r) => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (r) => <Actions review={r} busy={pendingId === r.id} {...actionProps} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={reviews}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyState={emptyState}
      caption="Reviews"
      mobileCard={(r) => (
        <article className="bg-card space-y-3 rounded-lg border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={routes.product(r.productSlug)} className="font-medium hover:underline">
                {r.productName}
              </Link>
              <p className="text-muted-foreground text-xs">
                {r.authorName} · {formatDate(r.createdAt)}
              </p>
            </div>
            <ReviewStatusBadge status={r.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={r.rating} size="sm" />
            <p className="font-medium">{r.title}</p>
          </div>
          <p className="text-muted-foreground text-xs">{excerpt(r.body, 140)}</p>
          <Photos urls={r.photoUrls} />
          <Actions review={r} busy={pendingId === r.id} {...actionProps} />
        </article>
      )}
    />
  )
}
