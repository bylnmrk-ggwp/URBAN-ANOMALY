import type { MockStore } from '@/mocks/MockStore'
import { byNewest, clone } from '@/mocks/helpers'

import type { AppNotification, NotificationRepository } from '../domain/entities'

export class MockNotificationRepository implements NotificationRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async list(): Promise<AppNotification[]> {
    await this.store.delay()
    return clone([...this.store.notifications].sort(byNewest))
  }

  async markRead(id: string): Promise<void> {
    await this.store.delay()
    const notification = this.store.notifications.find((n) => n.id === id)
    if (notification) notification.isRead = true
  }

  async markAllRead(): Promise<void> {
    await this.store.delay()
    for (const notification of this.store.notifications) notification.isRead = true
  }

  subscribe(onNew: (notification: AppNotification) => void): () => void {
    return this.store.onNotification((notification) => onNew(clone(notification)))
  }
}
