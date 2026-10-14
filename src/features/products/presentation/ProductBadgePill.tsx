import type { ProductBadge } from '@/features/products/domain/entities'
import { cn } from '@/lib/utils'

const labels: Record<ProductBadge, string> = {
  new: 'New',
  sale: 'Sale',
  sold_out: 'Sold out',
}

interface ProductBadgePillProps {
  badge: ProductBadge
  className?: string
}

export function ProductBadgePill({ badge, className }: ProductBadgePillProps) {
  return (
    <span
      className={cn(
        'bg-background/90 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase backdrop-blur-sm',
        badge === 'sold_out' ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
    >
      {labels[badge]}
    </span>
  )
}
