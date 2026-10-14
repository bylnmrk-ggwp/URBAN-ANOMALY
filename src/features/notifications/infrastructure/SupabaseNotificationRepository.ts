import type {
  AppNotification,
  NotificationRepository,
} from '@/features/notifications/domain/entities'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toNotification, unwrap } from '@/lib/supabase/mappers'
import type { NotificationRow } from '@/lib/supabase/mappers'

const LIST_LIMIT = 50

/**
 * Admin notifications. RLS restricts the table to admins, and Realtime honours the same
 * policies, so a buyer's subscription simply never receives rows.
 */
export class SupabaseNotificationRepository implements NotificationRepository {
  private get db() {
    return getSupabaseClient()
  }

  async list(): Promise<AppNotification[]> {
    const result = await this.db
      .from('notifications')
      .select('*')
      .eq('recipient_role', 'admin')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT)
    return unwrap(result).map(toNotification)
  }

  async markRead(id: string): Promise<void> {
    unwrap(await this.db.from('notifications').update({ is_read: true }).eq('id', id))
  }

  async markAllRead(): Promise<void> {
    unwrap(
      await this.db
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_role', 'admin')
        .eq('is_read', false),
    )
  }

  subscribe(onNew: (notification: AppNotification) => void): () => void {
    const client = this.db
    const channel = client
      .channel(`notifications-admin-${Math.random().toString(36).slice(2)}`)
      .on<NotificationRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'recipient_role=eq.admin',
        },
        (payload) => {
          onNew(toNotification(payload.new))
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }
}
