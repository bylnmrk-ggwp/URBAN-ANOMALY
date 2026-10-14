import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { OrderStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCancelMyOrder, useMyOrder } from '@/features/orders/application/customer'
import { canCustomerCancel } from '@/features/orders/domain/rules'
import { OrderInfoGrid } from '@/features/orders/presentation/OrderInfoGrid'
import { OrderItemsList } from '@/features/orders/presentation/OrderItemsList'
import { OrderSummaryCard } from '@/features/orders/presentation/OrderSummaryCard'
import { OrderTimeline } from '@/features/orders/presentation/OrderTimeline'
import { OrderReturnPanel } from '@/features/returns/presentation/OrderReturnPanel'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const orderQuery = useMyOrder(id)
  const cancelOrder = useCancelMyOrder()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const order = orderQuery.data ?? null

  const handleCancel = async () => {
    if (!order) return
    try {
      await cancelOrder.mutateAsync(order.id)
      toast.success('Order cancelled')
      setConfirmOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not cancel this order.'))
    }
  }

  return (
    <div className="container-x max-w-4xl py-12 lg:py-16">
      <Button asChild variant="link" className="mb-4 px-0">
        <Link to={routes.myOrders}>
          <ArrowLeft aria-hidden="true" />
          My orders
        </Link>
      </Button>

      {orderQuery.isPending ? (
        <div className="space-y-8" aria-busy="true">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : orderQuery.isError ? (
        <ErrorState
          error={orderQuery.error}
          onRetry={() => void orderQuery.refetch()}
          isRetrying={orderQuery.isFetching}
        />
      ) : !order ? (
        <ErrorState
          title="Order not found"
          message="This order doesn't exist or belongs to another account."
        />
      ) : (
        <>
          <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Order {order.orderNumber}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Placed {formatDateTime(order.createdAt)}
              </p>
              <div className="mt-3">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            {canCustomerCancel(order) ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive min-h-11"
                onClick={() => setConfirmOpen(true)}
              >
                Cancel order
              </Button>
            ) : null}
          </header>

          <section aria-label="Order progress" className="rounded-md border p-6">
            <OrderTimeline order={order} />
          </section>

          <div className="mt-8 space-y-8">
            <OrderInfoGrid order={order} />
            <div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight">Items</h2>
              <OrderItemsList items={order.items} />
            </div>
            <OrderSummaryCard order={order} />
            <OrderReturnPanel order={order} />
          </div>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Cancel this order?"
            description={`Order ${order.orderNumber} will be cancelled and any reserved stock released. This cannot be undone.`}
            confirmLabel="Cancel order"
            cancelLabel="Keep order"
            destructive
            isPending={cancelOrder.isPending}
            onConfirm={handleCancel}
          />
        </>
      )}
    </div>
  )
}
