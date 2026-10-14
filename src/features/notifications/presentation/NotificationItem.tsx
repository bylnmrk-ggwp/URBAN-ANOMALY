import {
  CircleAlert,
  CircleCheck,
  Mail,
  ShoppingBag,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

import type { AppNotification, NotificationType } from '@/features/notifications/domain/entities'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

const typeIcons: Record<NotificationType, LucideIcon> = {
  new_order: ShoppingBag,
  payment_confirmed: CircleCheck,
  low_stock: TriangleAlert,
  order_issue: CircleAlert,
  order_update: Mail,
}

const typeTone: Record<NotificationType, string> = {
  new_order: 'text-info',
  payment_confirmed: 'text-success',
  low_stock: 'text-warning',
  order_issue: 'text-destructive',
  order_update: 'text-info',
}

interface NotificationItemProps {
  notification: AppNotification
  onOpen: (notification: AppNotification) => void
}

export function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const Icon = typeIcons[notification.type]
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="hover:bg-muted flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      >
        <Icon
          className={cn('mt-0.5 size-4 shrink-0', typeTone[notification.type])}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn('truncate text-sm', !notification.isRead && 'font-semibold')}>
              {notification.title}
            </span>
            {notification.isRead ? null : (
              <span className="bg-info size-2 shrink-0 rounded-full" aria-hidden="true" />
            )}
            {notification.isRead ? null : <span className="sr-only">Unread</span>}
          </span>
          <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
            {notification.message}
          </span>
          <time
            dateTime={notification.createdAt}
            className="text-muted-foreground mt-1 block text-[11px]"
          >
            {formatRelative(notification.createdAt)}
          </time>
        </span>
      </button>
    </li>
  )
}
