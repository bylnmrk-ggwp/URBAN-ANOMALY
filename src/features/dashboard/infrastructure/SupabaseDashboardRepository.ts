import type { DashboardRepository, DashboardSummary } from '@/features/dashboard/domain/entities'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  dashboardSummaryJsonSchema,
  parseRpcJson,
  toDashboardSummary,
  unwrap,
} from '@/lib/supabase/mappers'

/** All aggregation happens in the admin-only `dashboard_summary` SQL function. */
export class SupabaseDashboardRepository implements DashboardRepository {
  private get db() {
    return getSupabaseClient()
  }

  async getSummary(range: { days: number }): Promise<DashboardSummary> {
    const days = Math.min(365, Math.max(1, Math.floor(range.days)))
    const data = unwrap(await this.db.rpc('dashboard_summary', { p_days: days }))
    return toDashboardSummary(parseRpcJson(dashboardSummaryJsonSchema, data, 'dashboard_summary'))
  }
}
