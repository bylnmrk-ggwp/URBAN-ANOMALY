import type { ReturnItem } from '@/features/returns/domain/entities'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ReturnItemsListProps {
  items: ReturnItem[]
  className?: string
}

export function ReturnItemsList({ items, className }: ReturnItemsListProps) {
  return (
    <ul className={cn('divide-border divide-y text-sm', className)}>
      {items.map((item) => (
        <li
          key={item.orderItemId}
          className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium">{item.productName}</p>
            <p className="text-muted-foreground text-xs">
              {item.size} · {item.colorName}
            </p>
          </div>
          <p className="text-muted-foreground shrink-0 tabular-nums">
            {item.quantity} × {formatPrice(item.unitPrice)}
          </p>
        </li>
      ))}
    </ul>
  )
}
