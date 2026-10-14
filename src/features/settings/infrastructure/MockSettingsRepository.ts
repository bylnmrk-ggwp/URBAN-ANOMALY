import type { MockStore } from '@/mocks/MockStore'
import { clone } from '@/mocks/helpers'

import type { SettingsRepository, StoreSettings, StoreSettingsInput } from '../domain/entities'

export class MockSettingsRepository implements SettingsRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async get(): Promise<StoreSettings> {
    await this.store.delay()
    return clone(this.store.settings)
  }

  async update(input: StoreSettingsInput): Promise<StoreSettings> {
    await this.store.delay()
    // Integration flags are owned by the backend and never editable from the form.
    const { onlinePaymentConfigured, emailNotificationsConfigured } = this.store.settings
    this.store.settings = {
      ...input,
      logoUrl: input.logoUrl || null,
      onlinePaymentConfigured,
      emailNotificationsConfigured,
    }
    return clone(this.store.settings)
  }
}
