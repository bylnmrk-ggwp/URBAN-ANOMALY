import { OrderStatusBadge } from '@/components/common/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'

import type { OrderStatusEvent } from '../../domain/entities'

const ACTOR_LABELS: Record<OrderStatusEvent['actor'], string> = {
  customer: 'Customer',
  admin: 'Staff',
  system: 'System',
}

interface StatusHistoryProps {
  history: OrderStatusEvent[]
}

export function StatusHistory({ history }: StatusHistoryProps) {
  const events = [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Status history</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No status changes recorded.</p>
        ) : (
          <ol className="divide-y">
            {events.map((event) => (
              <li key={event.id} className="space-y-1 py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <OrderStatusBadge status={event.status} />
                  <time dateTime={event.createdAt} className="text-muted-foreground text-xs">
                    {formatDateTime(event.createdAt)}
                  </time>
                </div>
                <p className="text-muted-foreground text-xs">by {ACTOR_LABELS[event.actor]}</p>
                {event.note ? <p>{event.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
