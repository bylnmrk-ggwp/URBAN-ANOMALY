import { TrendingUp } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ProductImage } from '@/components/common/ProductImage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, pluralize } from '@/lib/format'

import type { BestSeller } from '../domain/entities'

interface BestSellersListProps {
  items: BestSeller[] | undefined
  isLoading: boolean
}

export function BestSellersList({ items, isLoading }: BestSellersListProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="text-muted-foreground size-4" aria-hidden="true" />
          Best sellers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !items ? (
          <ul className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No sales yet.</p>
        ) : (
          <ol className="divide-y">
            {items.map((item, index) => (
              <li
                key={item.productId}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-muted-foreground w-4 text-xs tabular-nums">{index + 1}</span>
                <ProductImage
                  src={item.imageUrl}
                  alt={item.productName}
                  aspect="square"
                  className="size-10 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={routes.product(item.productSlug)}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {item.productName}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {pluralize(item.unitsSold, 'unit')} sold
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {formatPrice(item.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
