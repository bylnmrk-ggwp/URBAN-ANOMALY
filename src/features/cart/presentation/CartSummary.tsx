import type { ReactNode } from 'react'

import type { CartTotals } from '@/features/cart/domain/entities'
import { cn } from '@/lib/utils'

import { CartTotalsList } from './CartTotalsList'

interface CartSummaryProps {
  totals: CartTotals
  title?: string
  children?: ReactNode
  className?: string
}

export function CartSummary({
  totals,
  title = 'Order summary',
  children,
  className,
}: CartSummaryProps) {
  return (
    <section
      aria-labelledby="cart-summary-heading"
      className={cn('bg-muted/40 rounded-md border p-6', className)}
    >
      <h2 id="cart-summary-heading" className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <CartTotalsList totals={totals} className="mt-6" />
      {children ? <div className="mt-6 space-y-3">{children}</div> : null}
    </section>
  )
}
