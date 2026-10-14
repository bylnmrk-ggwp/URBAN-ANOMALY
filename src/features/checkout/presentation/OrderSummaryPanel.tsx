import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { ProductImage } from '@/components/common/ProductImage'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { CartTotals, ResolvedCartLine } from '@/features/cart/domain/entities'
import { CartTotalsList } from '@/features/cart/presentation/CartTotalsList'
import { getPrimaryImage } from '@/features/products/domain/rules'
import { formatPrice, pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'

import { DiscountCodeField, type DiscountFieldState } from './DiscountCodeField'

interface OrderSummaryPanelProps {
  lines: ResolvedCartLine[]
  totals: CartTotals
  /** When provided, renders the discount code field and the discount line. */
  discount?: DiscountFieldState
  className?: string
}

function SummaryLines({ lines }: { lines: ResolvedCartLine[] }) {
  return (
    <ul className="divide-border divide-y">
      {lines.map((line) => {
        const image = line.product ? getPrimaryImage(line.product) : null
        return (
          <li key={line.item.variantId} className="flex items-center gap-4 py-4">
            <div className="relative w-16 shrink-0">
              <ProductImage
                src={image?.url}
                alt=""
                decorative
                className="rounded-md"
                sizes="64px"
              />
              <span
                className="bg-foreground text-background absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums"
                aria-hidden="true"
              >
                {line.item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug font-medium">
                {line.product?.name ?? 'Unavailable item'}
              </p>
              {line.variant ? (
                <p className="text-muted-foreground text-sm">
                  {line.variant.size} · {line.variant.color.name}
                </p>
              ) : null}
              <p className="sr-only">Quantity {line.item.quantity}</p>
            </div>
            <p className="text-sm font-medium tabular-nums">{formatPrice(line.lineTotal)}</p>
          </li>
        )
      })}
    </ul>
  )
}

export function OrderSummaryPanel({ lines, totals, discount, className }: OrderSummaryPanelProps) {
  const [open, setOpen] = useState(false)
  const itemLabel = pluralize(totals.itemCount, 'item')
  const applied = discount?.applied ?? null
  const discountAmount = applied ? Math.min(applied.amount, totals.subtotal) : 0
  const payable = Math.round((totals.total - discountAmount) * 100) / 100

  return (
    <aside aria-label="Order summary" className={className}>
      {/* Mobile: collapsible */}
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border lg:hidden">
        <CollapsibleTrigger className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium">
          <span className="flex items-center gap-2">
            {open ? 'Hide' : 'Show'} order summary
            <ChevronDown
              className={cn('size-4 transition-transform', open && 'rotate-180')}
              aria-hidden="true"
            />
          </span>
          <span className="tabular-nums">· {formatPrice(payable)}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t px-4 pb-4">
          <SummaryLines lines={lines} />
          {discount ? (
            <div className="border-border border-t py-4">
              <DiscountCodeField {...discount} />
            </div>
          ) : null}
          <CartTotalsList totals={totals} discount={applied} className="mt-2" />
        </CollapsibleContent>
      </Collapsible>

      {/* Desktop: sticky panel */}
      <div className="bg-muted/40 hidden rounded-md border p-6 lg:sticky lg:top-24 lg:block">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Order summary</h2>
          <span className="text-muted-foreground text-sm">{itemLabel}</span>
        </div>
        <SummaryLines lines={lines} />
        {discount ? (
          <div className="border-border border-t py-4">
            <DiscountCodeField {...discount} />
          </div>
        ) : null}
        <CartTotalsList totals={totals} discount={applied} className="mt-2" />
      </div>
    </aside>
  )
}
