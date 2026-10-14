import { PackageSearch } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { OrderStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/application/useAuth'
import { useTrackOrder } from '@/features/orders/application/customer'
import type { Order } from '@/features/orders/domain/entities'
import type { TrackOrderInput } from '@/features/orders/domain/trackOrder'
import { OrderInfoGrid } from '@/features/orders/presentation/OrderInfoGrid'
import { OrderItemsList } from '@/features/orders/presentation/OrderItemsList'
import { OrderSummaryCard } from '@/features/orders/presentation/OrderSummaryCard'
import { OrderTimeline } from '@/features/orders/presentation/OrderTimeline'
import { TrackOrderForm } from '@/features/orders/presentation/TrackOrderForm'
import { formatDateTime } from '@/lib/format'

type LookupState = { kind: 'idle' } | { kind: 'not_found' } | { kind: 'found'; order: Order }

function TrackedOrder({ order, onReset }: { order: Order; onReset: () => void }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
            Order
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight break-all sm:text-3xl">
            {order.orderNumber}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Placed {formatDateTime(order.createdAt)}
          </p>
          <div className="mt-3">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
        <Button variant="outline" className="min-h-11" onClick={onReset}>
          Track another order
        </Button>
      </div>

      <section aria-label="Progress" className="rounded-md border p-5 sm:p-6">
        <OrderTimeline order={order} />
      </section>

      <OrderInfoGrid order={order} />

      <div>
        <h3 className="mb-2 text-lg font-semibold tracking-tight">Items</h3>
        <OrderItemsList items={order.items} />
      </div>

      <OrderSummaryCard order={order} />
    </div>
  )
}

export default function TrackOrderPage() {
  const { user } = useAuth()
  const track = useTrackOrder()
  const [state, setState] = useState<LookupState>({ kind: 'idle' })

  const onSubmit = async (values: TrackOrderInput) => {
    const order = await track.mutateAsync(values).catch(() => undefined)
    if (order === undefined) return
    setState(order ? { kind: 'found', order } : { kind: 'not_found' })
  }

  const reset = () => {
    track.reset()
    setState({ kind: 'idle' })
  }

  return (
    <div className="container-x max-w-3xl py-12 lg:py-16">
      {state.kind === 'found' ? (
        <TrackedOrder order={state.order} onReset={reset} />
      ) : (
        <>
          <header className="mb-10">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
              Order status
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Track your order
            </h1>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Enter your order number and the email you checked out with. No account needed.
            </p>
          </header>

          <div className="mx-auto max-w-md space-y-6">
            <TrackOrderForm
              onSubmit={onSubmit}
              isPending={track.isPending}
              defaultEmail={user?.email ?? ''}
            />

            {track.isError ? (
              <ErrorState
                title="Could not look up that order"
                error={track.error}
                onRetry={() => track.reset()}
              />
            ) : null}

            {state.kind === 'not_found' ? (
              <EmptyState
                icon={PackageSearch}
                title="We couldn't find an order with those details."
                description="Check the order number and make sure the email matches the one used at checkout."
                className="py-10"
              />
            ) : null}

            {user ? (
              <p className="text-muted-foreground text-center text-sm">
                Signed in?{' '}
                <Link
                  to={routes.myOrders}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  See all your orders
                </Link>
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
