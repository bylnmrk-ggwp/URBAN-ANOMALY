import { AlertTriangle, X } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ProductImage } from '@/components/common/ProductImage'
import { Button } from '@/components/ui/button'
import type { CartLineIssue, ResolvedCartLine } from '@/features/cart/domain/entities'
import { getPrimaryImage } from '@/features/products/domain/rules'
import { QuantitySelector } from '@/features/products/presentation/QuantitySelector'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CartLineItemProps {
  line: ResolvedCartLine
  /** Stock the quantity was recently reduced to; shows a notice after the store was synced. */
  reducedTo?: number
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  className?: string
}

function issueMessage(issue: CartLineIssue, available: number): string {
  switch (issue) {
    case 'product_unavailable':
      return 'This product is no longer available.'
    case 'variant_unavailable':
      return 'This size and color combination is no longer available.'
    case 'out_of_stock':
      return 'Out of stock — remove this item to continue.'
    case 'quantity_reduced':
      return `Only ${available} left — quantity updated`
  }
}

export function CartLineItem({
  line,
  reducedTo,
  onQuantityChange,
  onRemove,
  className,
}: CartLineItemProps) {
  const { product, variant, item } = line
  const image = product ? getPrimaryImage(product) : null
  const name = product?.name ?? 'Unavailable item'
  const blocking = line.issue !== null && line.issue !== 'quantity_reduced'
  const notice = line.issue
    ? issueMessage(line.issue, line.availableStock)
    : reducedTo !== undefined
      ? issueMessage('quantity_reduced', reducedTo)
      : null

  return (
    <li className={cn('flex gap-4 py-6 sm:gap-6', className)}>
      <div className="w-24 shrink-0 sm:w-28">
        {product ? (
          <Link to={routes.product(product.slug)} tabIndex={-1} aria-hidden="true">
            <ProductImage src={image?.url} alt="" decorative className="rounded-md" sizes="112px" />
          </Link>
        ) : (
          <ProductImage src={null} alt="" decorative className="rounded-md" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm leading-snug font-medium">
              {product ? (
                <Link to={routes.product(product.slug)} className="hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h3>
            {variant ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {variant.size} · {variant.color.name}
              </p>
            ) : null}
            {!blocking ? (
              <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                {formatPrice(line.unitPrice)} each
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mt-1 -mr-2 size-11 shrink-0"
            onClick={onRemove}
            aria-label={`Remove ${name} from cart`}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        {notice ? (
          <p
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-md px-3 py-2 text-sm',
              blocking ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning',
            )}
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        ) : null}

        {!blocking ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <QuantitySelector
              size="sm"
              value={item.quantity}
              max={line.availableStock}
              onChange={onQuantityChange}
              label={`Quantity for ${name}`}
            />
            <p className="text-sm font-medium tabular-nums">{formatPrice(line.lineTotal)}</p>
          </div>
        ) : null}
      </div>
    </li>
  )
}
