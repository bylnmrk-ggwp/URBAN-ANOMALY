import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrderReturn } from '@/features/returns/application/hooks'
import { RETURN_REASON_LABELS } from '@/features/returns/domain/entities'
import { formatDateTime, formatPrice } from '@/lib/format'

import { ReturnItemsList } from '../ReturnItemsList'
import { ReturnStatusBadge } from '../ReturnStatusBadge'
import { ReturnActions } from './ReturnActions'

interface ReturnRequestCardProps {
  orderId: string
}

/** Admin order page card. Renders nothing when the order has no return request. */
export function ReturnRequestCard({ orderId }: ReturnRequestCardProps) {
  const request = useOrderReturn(orderId)
  if (request.isPending) return <Skeleton className="h-40 w-full rounded-lg" />
  if (request.isError || !request.data) return null
  const data = request.data

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">Return request</CardTitle>
          <ReturnStatusBadge status={data.status} />
        </div>
        <CardDescription>
          {formatDateTime(data.createdAt)} · {RETURN_REASON_LABELS[data.reason]} ·{' '}
          {data.resolution === 'refund' ? 'Refund' : 'Exchange'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ReturnItemsList items={data.items} />
        <p className="flex items-center justify-between border-t pt-3">
          <span>Refund amount</span>
          <span className="font-semibold tabular-nums">{formatPrice(data.refundAmount)}</span>
        </p>
        {data.note ? (
          <blockquote className="text-muted-foreground border-l-2 pl-3 text-xs">
            “{data.note}”
          </blockquote>
        ) : null}
        {data.adminNote ? (
          <p className="text-muted-foreground text-xs">
            <span className="font-medium">Admin note:</span> {data.adminNote}
          </p>
        ) : null}
        <ReturnActions request={data} />
      </CardContent>
    </Card>
  )
}
