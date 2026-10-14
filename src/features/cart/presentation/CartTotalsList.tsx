import type { CartTotals } from '@/features/cart/domain/entities'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CartTotalsListProps {
  totals: CartTotals
  /** Applied checkout discount; subtracted from the displayed total. */
  discount?: { code: string; amount: number } | null
  className?: string
}

/** Subtotal / shipping / total rows shared by the cart summary and checkout panel. */
export function CartTotalsList({ totals, discount = null, className }: CartTotalsListProps) {
  const remainingForFreeShipping = Math.max(0, totals.freeShippingThreshold - totals.subtotal)
  const discountAmount = discount ? Math.min(discount.amount, totals.subtotal) : 0
  const total = Math.round((totals.total - discountAmount) * 100) / 100

  return (
    <dl className={cn('space-y-3 text-sm', className)}>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="tabular-nums">
          {totals.shippingFee === 0 ? 'Free' : formatPrice(totals.shippingFee)}
        </dd>
      </div>
      {totals.shippingFee > 0 ? (
        <div>
          <dd className="text-muted-foreground text-xs">
            Free shipping on orders over {formatPrice(totals.freeShippingThreshold)} — add{' '}
            {formatPrice(remainingForFreeShipping)} more to qualify.
          </dd>
        </div>
      ) : null}
      {discount ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            Discount <span className="font-mono text-xs">({discount.code})</span>
          </dt>
          <dd className="text-success tabular-nums">−{formatPrice(discountAmount)}</dd>
        </div>
      ) : null}
      <div className="border-border flex justify-between gap-4 border-t pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(total)}</dd>
      </div>
    </dl>
  )
}
