import { getSupabaseClient } from '@/lib/supabase/client'
import { parseRpcJson, stockAlertJsonSchema, toStockAlert, unwrap } from '@/lib/supabase/mappers'

import type { StockAlert, StockAlertRepository } from '../domain/entities'

/**
 * Subscriptions live in `stock_alerts` (0006_features_round2.sql). Visitors only call the
 * `subscribe_stock_alert` RPC (validates the e-mail, requires a published variant, dedupes
 * waiting alerts); admins read the `stock_alert_rows` view and mark variants notified through
 * `mark_stock_alerts_notified`. A trigger notifies admins when a sold-out variant with waiting
 * subscribers is restocked; sending the e-mails stays a backend concern.
 */
export class SupabaseStockAlertRepository implements StockAlertRepository {
  private get db() {
    return getSupabaseClient()
  }

  async subscribe({ variantId, email }: { variantId: string; email: string }): Promise<StockAlert> {
    const data = unwrap(
      await this.db.rpc('subscribe_stock_alert', {
        p_variant_id: variantId,
        p_email: email.trim().toLowerCase(),
      }),
    )
    return toStockAlert(parseRpcJson(stockAlertJsonSchema, data, 'subscribe_stock_alert'))
  }

  async list(): Promise<StockAlert[]> {
    const result = await this.db
      .from('stock_alert_rows')
      .select('*')
      .order('created_at', { ascending: false })
    return unwrap(result).map(toStockAlert)
  }

  async markNotified(variantId: string): Promise<number> {
    return unwrap(await this.db.rpc('mark_stock_alerts_notified', { p_variant_id: variantId }))
  }
}
