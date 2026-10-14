import { ArrowLeft, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminOrder } from '@/features/orders/application/admin'
import { NotesCard } from '@/features/orders/presentation/admin/NotesCard'
import { OrderActionsCard } from '@/features/orders/presentation/admin/OrderActionsCard'
import { PaymentCard } from '@/features/orders/presentation/admin/PaymentCard'
import { StatusHistory } from '@/features/orders/presentation/admin/StatusHistory'
import { TrackingCard } from '@/features/orders/presentation/admin/TrackingCard'
import { OrderInfoGrid } from '@/features/orders/presentation/OrderInfoGrid'
import { OrderItemsList } from '@/features/orders/presentation/OrderItemsList'
import { OrderSummaryCard } from '@/features/orders/presentation/OrderSummaryCard'
import { OrderTimeline } from '@/features/orders/presentation/OrderTimeline'
import { ReturnRequestCard } from '@/features/returns/presentation/admin/ReturnRequestCard'
import { formatDateTime, pluralize } from '@/lib/format'

const TRACKING_VISIBLE_FROM = ['confirmed', 'processing', 'shipped', 'delivered'] as const

function DetailsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading order">
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function AdminOrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const order = useAdminOrder(id)

  const backLink = (
    <Button asChild variant="ghost" size="sm">
      <Link to={routes.admin.orders}>
        <ArrowLeft aria-hidden="true" />
        Back to orders
      </Link>
    </Button>
  )

  if (order.isPending) {
    return (
      <div className="space-y-6">
        {backLink}
        <DetailsSkeleton />
      </div>
    )
  }

  if (order.isError) {
    return (
      <div className="space-y-6">
        {backLink}
        <ErrorState
          title="Could not load the order"
          error={order.error}
          onRetry={() => void order.refetch()}
          isRetrying={order.isRefetching}
        />
      </div>
    )
  }

  const data = order.data
  if (!data) {
    return (
      <div className="space-y-6">
        {backLink}
        <ErrorState
          title="Order not found"
          message="This order does not exist or has been removed."
          className="border-border bg-transparent"
        />
      </div>
    )
  }

  const showTracking = TRACKING_VISIBLE_FROM.some((s) => s === data.status)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {backLink}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {data.orderNumber}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Placed {formatDateTime(data.createdAt)} · {pluralize(data.items.length, 'item')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Agent C: printable packing slip */}
            <Button asChild variant="outline" size="sm">
              <Link to={routes.admin.packingSlip(data.id)}>
                <Printer aria-hidden="true" />
                Packing slip
              </Link>
            </Button>
            <OrderStatusBadge status={data.status} />
            <PaymentStatusBadge status={data.paymentStatus} />
            <PaymentMethodBadge method={data.paymentMethod} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="gap-4 rounded-lg shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline order={data} />
            </CardContent>
          </Card>
          <Card className="gap-4 rounded-lg shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsList items={data.items} />
            </CardContent>
          </Card>
          <OrderSummaryCard order={data} />
          <OrderInfoGrid order={data} />
        </div>

        <div className="space-y-6">
          <OrderActionsCard order={data} />
          {showTracking ? <TrackingCard key={data.updatedAt} order={data} /> : null}
          <PaymentCard order={data} />
          <NotesCard key={`${data.id}-${data.adminNotes}`} order={data} />
          <ReturnRequestCard orderId={data.id} />
          <StatusHistory history={data.statusHistory} />
        </div>
      </div>
    </div>
  )
}
