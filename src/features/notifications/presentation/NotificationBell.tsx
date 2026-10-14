import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/features/notifications/application/hooks'
import type { AppNotification } from '@/features/notifications/domain/entities'
import { getErrorMessage } from '@/lib/errors'

import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead, isMarkingAllRead, isLoading, error } =
    useNotifications()

  const onOpen = (notification: AppNotification) => {
    if (!notification.isRead) void markRead(notification.id)
    setOpen(false)
    navigate(notification.href)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-11"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="bg-destructive text-destructive-foreground absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0 || isMarkingAllRead}
          >
            Mark all as read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <ul className="space-y-1 p-2" aria-label="Loading notifications">
              {Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="flex gap-3 px-2 py-3">
                  <Skeleton className="size-4 rounded-full" />
                  <span className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </span>
                </li>
              ))}
            </ul>
          ) : error ? (
            <p role="alert" className="text-destructive px-4 py-8 text-center text-sm">
              {getErrorMessage(error, 'Notifications could not be loaded.')}
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm">
              You’re all caught up.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
