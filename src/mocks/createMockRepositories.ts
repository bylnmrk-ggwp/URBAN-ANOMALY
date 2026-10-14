import type { Repositories } from '@/config/repositories'
import { MockAuthRepository } from '@/features/auth/infrastructure/MockAuthRepository'
import { MockCategoryRepository } from '@/features/categories/infrastructure/MockCategoryRepository'
import { MockCmsRepository } from '@/features/cms/infrastructure/MockCmsRepository'
import { MockMediaRepository } from '@/features/cms/infrastructure/MockMediaRepository'
import { MockCustomerRepository } from '@/features/customers/infrastructure/MockCustomerRepository'
import { MockDashboardRepository } from '@/features/dashboard/infrastructure/MockDashboardRepository'
import { MockDiscountRepository } from '@/features/discounts/infrastructure/MockDiscountRepository'
import { MockInventoryRepository } from '@/features/inventory/infrastructure/MockInventoryRepository'
import { MockNotificationRepository } from '@/features/notifications/infrastructure/MockNotificationRepository'
import { MockOrderRepository } from '@/features/orders/infrastructure/MockOrderRepository'
import { OrderEmailGateway } from '@/features/orders/infrastructure/orderEmails'
import { MockProductRepository } from '@/features/products/infrastructure/MockProductRepository'
import { MockReturnRepository } from '@/features/returns/infrastructure/MockReturnRepository'
import { MockReviewRepository } from '@/features/reviews/infrastructure/MockReviewRepository'
import { MockSettingsRepository } from '@/features/settings/infrastructure/MockSettingsRepository'
import { MockStockAlertRepository } from '@/features/stock-alerts/infrastructure/MockStockAlertRepository'
import { MockTeamRepository } from '@/features/team/infrastructure/MockTeamRepository'
import type { EmailClient } from '@/lib/email/types'

import { MockStore } from './MockStore'

export interface MockRepositoryOptions {
  /**
   * Email client used for order notifications. Defaults to the app-wide one,
   * which is a no-op unless EmailJS is configured; tests pass a fake.
   */
  emailClient?: EmailClient
}

function buildRepositories(store: MockStore, options: MockRepositoryOptions = {}): Repositories {
  return {
    // Auth first: it rehydrates the persisted session the other repositories read.
    auth: new MockAuthRepository(store),
    products: new MockProductRepository(store),
    categories: new MockCategoryRepository(store),
    orders: new MockOrderRepository(store, new OrderEmailGateway(options.emailClient)),
    inventory: new MockInventoryRepository(store),
    customers: new MockCustomerRepository(store),
    notifications: new MockNotificationRepository(store),
    settings: new MockSettingsRepository(store),
    dashboard: new MockDashboardRepository(store),
    cms: new MockCmsRepository(store),
    media: new MockMediaRepository(store),
    discounts: new MockDiscountRepository(store),
    reviews: new MockReviewRepository(store),
    stockAlerts: new MockStockAlertRepository(store),
    returns: new MockReturnRepository(store),
    team: new MockTeamRepository(store),
  }
}

/** All mock repositories wired to one shared in-memory store. */
export function createMockRepositories(): Repositories {
  return buildRepositories(new MockStore())
}

/** Fresh store per call so tests can inspect and mutate state directly. */
export function createMockRepositoriesForTest(options: MockRepositoryOptions = {}): {
  repositories: Repositories
  store: MockStore
} {
  const store = new MockStore()
  return { repositories: buildRepositories(store, options), store }
}
