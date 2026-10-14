import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useMovements } from '../application/hooks'
import { type InventoryRow, MOVEMENT_REASON_LABELS } from '../domain/entities'

interface MovementsSheetProps {
  row: InventoryRow | null
  onOpenChange: (open: boolean) => void
}

export function MovementsSheet({ row, onOpenChange }: MovementsSheetProps) {
  const movements = useMovements(row?.variantId ?? null)

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Stock history</SheetTitle>
          <SheetDescription>
            {row ? (
              <>
                {row.productName} · {row.size} / {row.colorName} ·{' '}
                <span className="font-mono">{row.sku}</span>
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {movements.isPending ? (
            <ul className="space-y-4" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </li>
              ))}
            </ul>
          ) : movements.isError ? (
            <ErrorState
              title="Could not load history"
              error={movements.error}
              onRetry={() => void movements.refetch()}
              isRetrying={movements.isRefetching}
              className="py-8"
            />
          ) : movements.data.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No movements recorded for this variant.
            </p>
          ) : (
            <ol className="divide-y">
              {movements.data.map((m) => (
                <li key={m.id} className="space-y-1 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{MOVEMENT_REASON_LABELS[m.reason]}</span>
                    <span
                      className={cn(
                        'shrink-0 font-semibold tabular-nums',
                        m.delta > 0 ? 'text-success' : m.delta < 0 ? 'text-destructive' : '',
                      )}
                    >
                      {m.delta > 0 ? '+' : ''}
                      {m.delta}
                      <span className="text-muted-foreground ml-1 text-xs font-normal">
                        → {m.stockAfter}
                      </span>
                    </span>
                  </div>
                  {m.note ? <p className="text-muted-foreground">{m.note}</p> : null}
                  <p className="text-muted-foreground text-xs">
                    {m.actor} · <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
                    {m.referenceOrderNumber ? (
                      <>
                        {' · '}
                        <Link
                          to={`${routes.admin.orders}?search=${encodeURIComponent(m.referenceOrderNumber)}`}
                          className="hover:underline"
                        >
                          {m.referenceOrderNumber}
                        </Link>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
