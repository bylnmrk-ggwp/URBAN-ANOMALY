import type { AuthRepository } from '@/features/auth/domain/entities'
import type { CategoryRepository } from '@/features/categories/domain/repository'
import type { CmsRepository, MediaRepository } from '@/features/cms/domain/repository'
import type { CustomerRepository } from '@/features/customers/domain/entities'
import type { DashboardRepository } from '@/features/dashboard/domain/entities'
import type { DiscountRepository } from '@/features/discounts/domain/entities'
import type { InventoryRepository } from '@/features/inventory/domain/repository'
import type { NotificationRepository } from '@/features/notifications/domain/entities'
import type { OrderRepository } from '@/features/orders/domain/repository'
import type { ProductRepository } from '@/features/products/domain/repository'
import type { ReturnRepository } from '@/features/returns/domain/entities'
import type { ReviewRepository } from '@/features/reviews/domain/entities'
import type { SettingsRepository } from '@/features/settings/domain/entities'
import type { StockAlertRepository } from '@/features/stock-alerts/domain/entities'
import type { TeamRepository } from '@/features/team/domain/entities'

import { env } from './env'

/**
 * Composition root. Every application hook reads data through this object, so
 * swapping mock data for Supabase is a one-line environment change.
 */
export interface Repositories {
  products: ProductRepository
  categories: CategoryRepository
  orders: OrderRepository
  inventory: InventoryRepository
  customers: CustomerRepository
  notifications: NotificationRepository
  settings: SettingsRepository
  auth: AuthRepository
  dashboard: DashboardRepository
  cms: CmsRepository
  media: MediaRepository
  discounts: DiscountRepository
  reviews: ReviewRepository
  stockAlerts: StockAlertRepository
  returns: ReturnRepository
  team: TeamRepository
}

/**
 * Both factories are loaded on demand so the storefront bundle never ships the
 * Supabase SDK in mock mode, nor the seed data in Supabase mode.
 */
export const repositories: Repositories = env.isMock
  ? (await import('@/mocks/createMockRepositories')).createMockRepositories()
  : (await import('@/lib/supabase/createSupabaseRepositories')).createSupabaseRepositories()
