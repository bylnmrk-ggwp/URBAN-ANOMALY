import type {
  SettingsRepository,
  StoreSettings,
  StoreSettingsInput,
} from '@/features/settings/domain/entities'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toSettings, unwrap } from '@/lib/supabase/mappers'

/** `store_settings` is a single-row table; the row always has id 1 (seeded by the migration). */
const SETTINGS_ROW_ID = 1

export class SupabaseSettingsRepository implements SettingsRepository {
  private get db() {
    return getSupabaseClient()
  }

  async get(): Promise<StoreSettings> {
    const result = await this.db
      .from('store_settings')
      .select('*')
      .eq('id', SETTINGS_ROW_ID)
      .single()
    return toSettings(unwrap(result))
  }

  /**
   * `onlinePaymentConfigured` / `emailNotificationsConfigured` are intentionally not written
   * here: a DB trigger rejects client changes, and Edge Functions flip them once provider keys
   * are verified.
   */
  async update(input: StoreSettingsInput): Promise<StoreSettings> {
    const result = await this.db
      .from('store_settings')
      .update({
        store_name: input.storeName,
        logo_url: input.logoUrl || null,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        address: input.address,
        flat_shipping_fee: input.flatShippingFee,
        free_shipping_threshold: input.freeShippingThreshold,
        cod_enabled: input.codEnabled,
        online_payment_enabled: input.onlinePaymentEnabled,
        gcash_enabled: input.gcashEnabled,
        gcash_account_name: input.gcashAccountName,
        gcash_number: input.gcashNumber,
        gcash_qr_url: input.gcashQrUrl || null,
        default_low_stock_threshold: input.defaultLowStockThreshold,
        notify_new_orders: input.notifyNewOrders,
        notify_low_stock: input.notifyLowStock,
        notify_payment_events: input.notifyPaymentEvents,
      })
      .eq('id', SETTINGS_ROW_ID)
      .select('*')
      .single()
    return toSettings(unwrap(result))
  }
}
