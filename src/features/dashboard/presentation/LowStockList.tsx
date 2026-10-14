import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { StockStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryRow } from '@/features/inventory/domain/entities'

interface LowStockListProps {
  rows: InventoryRow[] | undefined
  isLoading: boolean
}

export function LowStockList({ rows, isLoading }: LowStockListProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="text-warning size-4" aria-hidden="true" />
          Low stock alerts
        </CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={routes.admin.inventory}>Inventory</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading || !rows ? (
          <ul className="space-y-3" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            All variants are above their thresholds.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.variantId}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.productName}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.sku} · {row.size} / {row.colorName} ·{' '}
                    <span className="text-foreground font-medium tabular-nums">
                      {row.availableStock}
                    </span>{' '}
                    available
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StockStatusBadge status={row.status} className="hidden sm:inline-flex" />
                  <Button asChild variant="outline" size="sm">
                    <Link to={`${routes.admin.inventory}?search=${encodeURIComponent(row.sku)}`}>
                      Adjust
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
