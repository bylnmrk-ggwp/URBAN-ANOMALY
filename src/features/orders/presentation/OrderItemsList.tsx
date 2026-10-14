import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ProductImage } from '@/components/common/ProductImage'
import type { OrderItem } from '@/features/orders/domain/entities'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface OrderItemsListProps {
  items: OrderItem[]
  /** Link product names to the storefront product page. */
  linkProducts?: boolean
  className?: string
}

export function OrderItemsList({ items, linkProducts = true, className }: OrderItemsListProps) {
  return (
    <ul className={cn('divide-border divide-y', className)}>
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 py-4">
          <ProductImage
            src={item.imageUrl}
            alt=""
            decorative
            className="w-16 shrink-0 rounded-md"
            sizes="64px"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm leading-snug font-medium">
                {linkProducts ? (
                  <Link to={routes.product(item.productSlug)} className="hover:underline">
                    {item.productName}
                  </Link>
                ) : (
                  item.productName
                )}
              </p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {item.size} · {item.colorName}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">SKU {item.sku}</p>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm sm:flex-col sm:items-end sm:gap-0.5">
              <p className="text-muted-foreground tabular-nums">
                {item.quantity} × {formatPrice(item.unitPrice)}
              </p>
              <p className="font-medium tabular-nums">{formatPrice(item.lineTotal)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
