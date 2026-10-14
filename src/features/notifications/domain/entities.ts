import type { ISODateString } from '@/types/common'

export type NotificationType =
  | 'new_order'
  | 'payment_confirmed'
  | 'low_stock'
  | 'order_issue'
  /** An admin acted on an order; records whether the customer email went out. */
  | 'order_update'
  /** A sold-out variant with waiting back-in-stock subscribers is available again. */
  | 'back_in_stock'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  /** In-app route the notification links to, e.g. /admin/orders/abc. */
  href: string
  isRead: boolean
  createdAt: ISODateString
}

export interface NotificationRepository {
  list(): Promise<AppNotification[]>
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
  /**
   * Realtime contract: Supabase mode subscribes to `postgres_changes` on the
   * `notifications` table filtered by recipient and invokes `onNew`.
   * Returns an unsubscribe function.
   */
  subscribe(onNew: (notification: AppNotification) => void): () => void
}
