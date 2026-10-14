import { MessageSquare, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAdminReviews,
  useDeleteReview,
  useSetReviewStatus,
} from '@/features/reviews/application/hooks'
import type { Review, ReviewStatus } from '@/features/reviews/domain/entities'
import { ReviewsTable } from '@/features/reviews/presentation/admin/ReviewsTable'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getErrorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'

type Tab = ReviewStatus | 'all'

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

function isTab(value: string): value is Tab {
  return TABS.some((t) => t.value === value)
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<Review | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim())

  const reviews = useAdminReviews({ status: tab, search: debouncedSearch || undefined })
  const pending = useAdminReviews({ status: 'pending' })
  const setStatus = useSetReviewStatus()
  const remove = useDeleteReview()
  const pendingCount = pending.data?.length ?? 0
  const busyId = setStatus.isPending
    ? setStatus.variables?.id
    : remove.isPending
      ? remove.variables
      : null

  const changeStatus = (review: Review, status: ReviewStatus) => {
    setStatus.mutate(
      { id: review.id, status },
      {
        onSuccess: () =>
          toast.success(`Review ${status === 'approved' ? 'approved' : 'rejected'}.`),
        onError: (error) => toast.error(getErrorMessage(error, 'Could not update the review.')),
      },
    )
  }

  const confirmDelete = () => {
    if (!toDelete) return
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Review deleted.')
        setToDelete(null)
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Could not delete the review.')),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description={
          reviews.data
            ? `${pluralize(reviews.data.length, 'review')}${debouncedSearch ? ' match your search' : tab === 'all' ? ' in total' : ` ${TABS.find((t) => t.value === tab)?.label.toLowerCase()}`}.`
            : 'Approve customer reviews before they appear on the storefront.'
        }
      />

      <div className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => isTab(v) && setTab(v)}>
          <div className="overflow-x-auto pb-1">
            <TabsList variant="line" aria-label="Filter reviews by status">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="px-3">
                  {t.label}
                  {t.value === 'pending' && pendingCount > 0 ? (
                    <span
                      className="bg-warning/15 text-warning rounded-full px-1.5 text-xs font-semibold tabular-nums"
                      aria-label={`${pendingCount} pending`}
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <div className="relative max-w-md">
          <Label htmlFor="reviews-search" className="sr-only">
            Search reviews
          </Label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="reviews-search"
            type="search"
            placeholder="Product, author or review text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {reviews.isError ? (
        <ErrorState
          title="Could not load reviews"
          error={reviews.error}
          onRetry={() => void reviews.refetch()}
          isRetrying={reviews.isRefetching}
        />
      ) : (
        <ReviewsTable
          reviews={reviews.data ?? []}
          isLoading={reviews.isPending}
          pendingId={busyId ?? null}
          onApprove={(r) => changeStatus(r, 'approved')}
          onReject={(r) => changeStatus(r, 'rejected')}
          onDelete={setToDelete}
          emptyState={
            <EmptyState
              icon={MessageSquare}
              title={debouncedSearch ? 'No reviews match your search' : 'No reviews here'}
              description={
                debouncedSearch
                  ? 'Try another product, author or phrase.'
                  : 'New customer reviews land in the Pending tab.'
              }
            />
          }
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this review?"
        description={
          toDelete
            ? `"${toDelete.title}" by ${toDelete.authorName} will be permanently removed.`
            : ''
        }
        confirmLabel="Delete review"
        destructive
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
