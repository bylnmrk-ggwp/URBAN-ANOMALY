import type { Repositories } from '@/config/repositories'
import { SupabaseAuthRepository } from '@/features/auth/infrastructure/SupabaseAuthRepository'
import { SupabaseCategoryRepository } from '@/features/categories/infrastructure/SupabaseCategoryRepository'
import { SupabaseCmsRepository } from '@/features/cms/infrastructure/SupabaseCmsRepository'
import { SupabaseMediaRepository } from '@/features/cms/infrastructure/SupabaseMediaRepository'
import { SupabaseCustomerRepository } from '@/features/customers/infrastructure/SupabaseCustomerRepository'
import { SupabaseDashboardRepository } from '@/features/dashboard/infrastructure/SupabaseDashboardRepository'
import { SupabaseInventoryRepository } from '@/features/inventory/infrastructure/SupabaseInventoryRepository'
import { SupabaseNotificationRepository } from '@/features/notifications/infrastructure/SupabaseNotificationRepository'
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository'
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository'
import { SupabaseSettingsRepository } from '@/features/settings/infrastructure/SupabaseSettingsRepository'
// Round 2 adapters, backed by supabase/migrations/0006_features_round2.sql.
import { SupabaseDiscountRepository } from '@/features/discounts/infrastructure/SupabaseDiscountRepository'
import { SupabaseTeamRepository } from '@/features/team/infrastructure/SupabaseTeamRepository'
import { SupabaseReturnRepository } from '@/features/returns/infrastructure/SupabaseReturnRepository'
import { SupabaseReviewRepository } from '@/features/reviews/infrastructure/SupabaseReviewRepository'
import { SupabaseStockAlertRepository } from '@/features/stock-alerts/infrastructure/SupabaseStockAlertRepository'

/**
 * Supabase-backed composition. Repositories resolve the client lazily, so constructing this
 * object never throws; the first query does if `VITE_SUPABASE_*` are missing.
 */
export function createSupabaseRepositories(): Repositories {
  return {
    products: new SupabaseProductRepository(),
    categories: new SupabaseCategoryRepository(),
    orders: new SupabaseOrderRepository(),
    inventory: new SupabaseInventoryRepository(),
    customers: new SupabaseCustomerRepository(),
    notifications: new SupabaseNotificationRepository(),
    settings: new SupabaseSettingsRepository(),
    auth: new SupabaseAuthRepository(),
    dashboard: new SupabaseDashboardRepository(),
    cms: new SupabaseCmsRepository(),
    media: new SupabaseMediaRepository(),
    // Round 2 (0006_features_round2.sql)
    stockAlerts: new SupabaseStockAlertRepository(),
    discounts: new SupabaseDiscountRepository(),
    team: new SupabaseTeamRepository(),
    reviews: new SupabaseReviewRepository(),
    returns: new SupabaseReturnRepository(),
  }
}
