import { CheckCircle2, Clock, PackageSearch, XCircle } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { OrderStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/application/useAuth'
import { PaymentHandoffState } from '@/features/checkout/presentation/PaymentHandoffState'
import { useOrderByNumber } from '@/features/orders/application/customer'
import type { Order } from '@/features/orders/domain/entities'
import { OrderInfoGrid } from '@/features/orders/presentation/OrderInfoGrid'
import { OrderItemsList } from '@/features/orders/presentation/OrderItemsList'
import { OrderSummaryCard } from '@/features/orders/presentation/OrderSummaryCard'
import { formatDateTime, formatPrice } from '@/lib/format'

/** A cancelled (or failed-payment) order never gets the "payment received" copy. */
function closedOrderMessage(order: Order): string {
  if (order.paymentMethod === 'gcash' && order.paymentStatus === 'failed') {
    return 'This order was cancelled; the GCash payment was not verified.'
  }
  if (order.paymentStatus === 'refund_pending') {
    return 'This order was cancelled; the payment will be refunded.'
  }
  if (order.paymentStatus === 'refunded') {
    return 'This order was cancelled; the payment has been refunded.'
  }
  if (order.status === 'cancelled') return 'This order was cancelled.'
  return 'The payment for this order did not go through.'
}

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const [searchParams] = useSearchParams()
  const { status } = useAuth()
  const orderQuery = useOrderByNumber(orderNumber)
  const order = orderQuery.data ?? null
  const paymentPendingHandoff = searchParams.get('payment') === 'pending'

  if (orderQuery.isPending) {
    return (
      <div className="container-x max-w-3xl py-12 lg:py-16" aria-busy="true">
        <Skeleton className="mx-auto size-14 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-10 w-2/3" />
        <Skeleton className="mx-auto mt-3 h-4 w-1/2" />
        <Skeleton className="mt-10 h-40 w-full" />
      </div>
    )
  }

  if (orderQuery.isError) {
    return (
      <div className="container-x max-w-3xl py-16">
        <ErrorState error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container-x max-w-3xl py-16">
        <EmptyState
          icon={PackageSearch}
          title="Order not found"
          description="We couldn't find an order with that number."
          action={
            <Button asChild className="min-h-11">
              <Link to={routes.shop}>Continue shopping</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Cancelled before the money was matched (GCash) or collected (online): nothing is owed.
  const closed = order.status === 'cancelled' || order.paymentStatus === 'failed'
  const awaitingPayment =
    !closed && order.paymentMethod === 'online' && order.paymentStatus !== 'paid'
  // The buyer has already sent the money; the store still has to match the reference.
  const awaitingVerification =
    !closed && order.paymentMethod === 'gcash' && order.paymentStatus === 'pending'
  const trackHref = routes.orderDetails(order.id)

  return (
    <div className="container-x max-w-3xl py-12 lg:py-16">
      <div className="text-center">
        <div
          className={
            closed
              ? 'bg-muted text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-full'
              : awaitingPayment
                ? 'bg-warning/10 text-warning mx-auto flex size-14 items-center justify-center rounded-full'
                : 'bg-success/10 text-success mx-auto flex size-14 items-center justify-center rounded-full'
          }
        >
          {closed ? (
            <XCircle className="size-7" aria-hidden="true" />
          ) : awaitingPayment ? (
            <Clock className="size-7" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-7" aria-hidden="true" />
          )}
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {closed
            ? order.status === 'cancelled'
              ? 'This order was cancelled'
              : 'Payment not completed'
            : awaitingPayment
              ? 'Awaiting payment confirmation'
              : 'Thank you for your order'}
        </h1>
        <p className="text-muted-foreground mt-3">
          Order <span className="text-foreground font-medium">{order.orderNumber}</span> · placed{' '}
          {formatDateTime(order.createdAt)}
        </p>
        <div className="mt-4 flex justify-center">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="mt-10 space-y-4">
        {closed ? (
          <div role="status" className="bg-muted/40 rounded-md border p-5 text-sm">
            <p className="font-medium">{closedOrderMessage(order)}</p>
            <p className="text-muted-foreground mt-1">
              Nothing more is needed from you. Keep your order number if you need to reach us about
              it.
            </p>
          </div>
        ) : awaitingPayment ? (
          <div
            role="status"
            className="border-warning/30 bg-warning/5 rounded-md border p-5 text-sm"
          >
            <p className="text-warning font-medium">
              Your order is reserved and waiting for payment.
            </p>
            <p className="text-muted-foreground mt-1">
              We'll confirm it as soon as the payment of {formatPrice(order.total)} is received. A
              confirmation email goes to {order.customer.email}.
            </p>
          </div>
        ) : awaitingVerification ? (
          <div
            role="status"
            className="border-warning/30 bg-warning/5 rounded-md border p-5 text-sm"
          >
            <p className="text-warning font-medium">We're verifying your GCash payment.</p>
            <p className="text-muted-foreground mt-1">
              Reference{' '}
              <span className="text-foreground font-mono text-xs">{order.paymentReference}</span>{' '}
              for {formatPrice(order.total)} is being matched against our GCash account. We'll
              confirm the order once it clears; updates go to {order.customer.email}.
            </p>
          </div>
        ) : (
          <div
            role="status"
            className="border-success/30 bg-success/5 rounded-md border p-5 text-sm"
          >
            <p className="text-success font-medium">
              {order.paymentMethod === 'cod'
                ? `Order placed — pay ${formatPrice(order.total)} on delivery.`
                : 'Order placed and payment received.'}
            </p>
            <p className="text-muted-foreground mt-1">
              Order updates for {order.customer.email} will be sent once email notifications are
              connected. Keep your order number to track progress.
            </p>
          </div>
        )}
        {awaitingPayment && paymentPendingHandoff ? <PaymentHandoffState /> : null}
      </div>

      <section className="mt-12 space-y-8" aria-label="Order details">
        <OrderInfoGrid order={order} />
        <div>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">Items</h2>
          <OrderItemsList items={order.items} />
        </div>
        <OrderSummaryCard order={order} />
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="min-h-12">
          {status === 'authenticated' ? (
            <Link to={trackHref}>Track order</Link>
          ) : (
            <Link to={routes.login} state={{ from: trackHref }}>
              Sign in to track order
            </Link>
          )}
        </Button>
        <Button asChild size="lg" variant="outline" className="min-h-12">
          <Link to={routes.shop}>Continue shopping</Link>
        </Button>
      </div>
    </div>
  )
}
