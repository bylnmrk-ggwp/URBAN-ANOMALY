import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import { SEED_STOCK_ALERTS } from '@/mocks/data/stockAlerts'
import { byNewest, clone, nowIso } from '@/mocks/helpers'

import type { StockAlert, StockAlertRepository } from '../domain/entities'

export class MockStockAlertRepository implements StockAlertRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
    if (this.store.stockAlerts.length === 0)
      this.store.stockAlerts.push(...clone(SEED_STOCK_ALERTS))
  }

  async subscribe({ variantId, email }: { variantId: string; email: string }): Promise<StockAlert> {
    await this.store.delay()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) throw new AppError('validation', 'Enter a valid email address.')

    const found = this.store.findVariant(variantId)
    if (!found || found.product.status !== 'published') throw AppError.notFound('Variant')

    const existing = this.store.stockAlerts.find(
      (alert) =>
        alert.variantId === variantId &&
        alert.email.toLowerCase() === normalizedEmail &&
        alert.status === 'waiting',
    )
    if (existing) return clone(existing)

    const { product, variant } = found
    const alert: StockAlert = {
      id: this.store.nextId('alert'),
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantId: variant.id,
      sku: variant.sku,
      size: variant.size,
      colorName: variant.color.name,
      email: normalizedEmail,
      status: 'waiting',
      createdAt: nowIso(),
      notifiedAt: null,
    }
    this.store.stockAlerts.unshift(alert)
    return clone(alert)
  }

  async list(): Promise<StockAlert[]> {
    await this.store.delay()
    return clone([...this.store.stockAlerts].sort(byNewest))
  }

  async markNotified(variantId: string): Promise<number> {
    await this.store.delay()
    const now = nowIso()
    let count = 0
    for (const alert of this.store.stockAlerts) {
      if (alert.variantId !== variantId || alert.status !== 'waiting') continue
      alert.status = 'notified'
      alert.notifiedAt = now
      count += 1
    }
    return count
  }
}
