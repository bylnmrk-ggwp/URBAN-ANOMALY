import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/features/orders/domain/entities'
import { useOrderReturn } from '@/features/returns/application/hooks'
import { isWithinReturnWindow, RETURN_WINDOW_DAYS } from '@/features/returns/domain/entities'

import { ReturnRequestButton } from './ReturnRequestButton'
import { ReturnStatusCard } from './ReturnStatusCard'

interface OrderReturnPanelProps {
  order: Order
}

function deliveredAt(order: Order): string | null {
  return order.statusHistory.find((e) => e.status === 'delivered')?.createdAt ?? null
}

/**
 * Everything return-related on the buyer's order page: the request button while the order is
 * eligible, or the status card once a request exists.
 */
export function OrderReturnPanel({ order }: OrderReturnPanelProps) {
  const existing = useOrderReturn(order.id)
  if (order.status !== 'delivered') return null

  const delivered = deliveredAt(order) ?? order.updatedAt
  const withinWindow = isWithinReturnWindow(delivered)

  if (existing.isPending) return <Skeleton className="h-11 w-48" aria-label="Checking returns" />
  if (existing.isError) return null

  const request = existing.data
  if (request && request.status !== 'rejected') return <ReturnStatusCard request={request} />

  return (
    <div className="space-y-6">
      {request ? <ReturnStatusCard request={request} /> : null}
      {withinWindow ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Not quite right?</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Returns are accepted within {RETURN_WINDOW_DAYS} days of delivery.
            </p>
          </div>
          <ReturnRequestButton order={order} />
        </div>
      ) : null}
    </div>
  )
}
