import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ReturnRequest } from '@/features/returns/domain/entities'
import { RETURN_REASON_LABELS } from '@/features/returns/domain/entities'
import { formatDateTime, formatPrice } from '@/lib/format'

import { ReturnItemsList } from '../ReturnItemsList'
import { ReturnStatusBadge } from '../ReturnStatusBadge'
import { ReturnActions } from './ReturnActions'

interface ReturnDetailsSheetProps {
  request: ReturnRequest | null
  onOpenChange: (open: boolean) => void
}

export function ReturnDetailsSheet({ request, onOpenChange }: ReturnDetailsSheetProps) {
  return (
    <Sheet open={request !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>Return for {request?.orderNumber ?? 'order'}</SheetTitle>
            {request ? <ReturnStatusBadge status={request.status} /> : null}
          </div>
          <SheetDescription>
            {request
              ? `Requested ${formatDateTime(request.createdAt)} · updated ${formatDateTime(request.updatedAt)}`
              : 'Return request details'}
          </SheetDescription>
        </SheetHeader>
        {request ? (
          <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
            <div className="space-y-5 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-md p-3">
                  <dt className="text-muted-foreground text-xs uppercase">Refund</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums">
                    {formatPrice(request.refundAmount)}
                  </dd>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <dt className="text-muted-foreground text-xs uppercase">Resolution</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {request.resolution === 'refund' ? 'Refund' : 'Exchange'}
                  </dd>
                </div>
              </dl>

              <section className="space-y-1">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Customer
                </h3>
                <p>{request.customerName}</p>
                <p className="text-muted-foreground text-xs">{request.customerEmail}</p>
                <Button asChild variant="link" className="h-auto px-0">
                  <Link to={routes.admin.orderDetails(request.orderId)}>
                    View order {request.orderNumber}
                  </Link>
                </Button>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Items · {RETURN_REASON_LABELS[request.reason]}
                </h3>
                <ReturnItemsList items={request.items} />
                {request.note ? (
                  <blockquote className="text-muted-foreground border-l-2 pl-3 text-xs">
                    “{request.note}”
                  </blockquote>
                ) : null}
              </section>

              {request.adminNote ? (
                <section className="space-y-1">
                  <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Admin note
                  </h3>
                  <p>{request.adminNote}</p>
                </section>
              ) : null}

              <Separator />

              <section className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Actions
                </h3>
                <ReturnActions request={request} />
              </section>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
