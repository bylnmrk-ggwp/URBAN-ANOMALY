import type { Order } from '@/features/orders/domain/entities'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface OrderSummaryCardProps {
  order: Pick<Order, 'subtotal' | 'shippingFee' | 'discount' | 'total'>
  title?: string
  className?: string
}

export function OrderSummaryCard({ order, title = 'Summary', className }: OrderSummaryCardProps) {
  return (
    <section aria-label={title} className={cn('rounded-md border p-5', className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="tabular-nums">
            {order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}
          </dd>
        </div>
        {order.discount > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
          </div>
        ) : null}
        <div className="border-border flex justify-between gap-4 border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatPrice(order.total)}</dd>
        </div>
      </dl>
    </section>
  )
}
