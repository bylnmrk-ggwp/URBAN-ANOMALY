import { ArrowLeft, PackageOpen } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyOrders } from '@/features/orders/application/customer'
import { formatDate, formatPrice, pluralize } from '@/lib/format'

export default function MyOrdersPage() {
  const orders = useMyOrders()

  return (
    <div className="container-x max-w-4xl py-12 lg:py-16">
      <header className="mb-10">
        <Button asChild variant="link" className="mb-4 px-0">
          <Link to={routes.account}>
            <ArrowLeft aria-hidden="true" />
            Account
          </Link>
        </Button>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">My orders</h1>
      </header>

      {orders.isPending ? (
        <ul className="space-y-4" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-32 w-full rounded-md" />
            </li>
          ))}
        </ul>
      ) : orders.isError ? (
        <ErrorState
          error={orders.error}
          onRetry={() => void orders.refetch()}
          isRetrying={orders.isFetching}
        />
      ) : orders.data.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="You haven't placed any orders yet."
          description="Once you do, you can track them here."
          action={
            <Button asChild className="min-h-11">
              <Link to={routes.shop}>Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {orders.data.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-4 rounded-md border p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-base font-semibold">{order.orderNumber}</h2>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <p className="text-muted-foreground text-sm">
                  {pluralize(order.itemCount, 'item')} ·{' '}
                  <span className="text-foreground font-medium tabular-nums">
                    {formatPrice(order.total)}
                  </span>
                </p>
              </div>
              <Button asChild variant="outline" className="min-h-11 sm:shrink-0">
                <Link to={routes.orderDetails(order.id)}>
                  View details
                  <span className="sr-only"> for order {order.orderNumber}</span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
