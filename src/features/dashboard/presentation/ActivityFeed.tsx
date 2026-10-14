import { Activity, Boxes, CreditCard, type LucideIcon, ShoppingCart, Tag } from 'lucide-react'
import { Link } from 'react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format'

import type { ActivityEvent } from '../domain/entities'

interface ActivityFeedProps {
  events: ActivityEvent[] | undefined
  isLoading: boolean
}

const ICONS: Record<ActivityEvent['type'], LucideIcon> = {
  order: ShoppingCart,
  inventory: Boxes,
  product: Tag,
  payment: CreditCard,
}

export function ActivityFeed({ events, isLoading }: ActivityFeedProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="text-muted-foreground size-4" aria-hidden="true" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !events ? (
          <ul className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex gap-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : events.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nothing has happened yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => {
              const Icon = ICONS[event.type]
              return (
                <li key={event.id} className="flex gap-3">
                  <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {event.href ? (
                      <Link to={event.href} className="block text-sm hover:underline">
                        {event.message}
                      </Link>
                    ) : (
                      <p className="text-sm">{event.message}</p>
                    )}
                    <time dateTime={event.createdAt} className="text-muted-foreground text-xs">
                      {formatRelative(event.createdAt)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
