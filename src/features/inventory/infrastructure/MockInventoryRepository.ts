import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import {
  byNewest,
  clone,
  deriveInventoryRows,
  matchesSearch,
  nowIso,
  toInventoryRow,
} from '@/mocks/helpers'
import type { PaginatedResult } from '@/types/common'
import { paginate } from '@/types/common'

import type {
  InventoryFilters,
  InventoryMovement,
  InventoryRow,
  StockAdjustmentInput,
} from '../domain/entities'
import { deriveStockStatus } from '../domain/entities'
import type { InventoryRepository } from '../domain/repository'

const DEFAULT_PAGE_SIZE = 25

export class MockInventoryRepository implements InventoryRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async list(filters: InventoryFilters): Promise<PaginatedResult<InventoryRow>> {
    await this.store.delay()
    let rows = deriveInventoryRows(this.store.products)
    if (filters.search) {
      rows = rows.filter((r) => matchesSearch(filters.search, r.productName, r.sku, r.colorName))
    }
    if (filters.status && filters.status !== 'all') {
      const status = filters.status
      rows = rows.filter((r) => r.status === status)
    }
    return paginate(rows, filters.page ?? 1, filters.pageSize ?? DEFAULT_PAGE_SIZE)
  }

  async getLowStock(limit: number): Promise<InventoryRow[]> {
    await this.store.delay()
    return deriveInventoryRows(this.store.products)
      .filter((r) => r.status !== 'in_stock')
      .sort((a, b) => a.availableStock - b.availableStock)
      .slice(0, limit)
  }

  async adjustStock(input: StockAdjustmentInput): Promise<InventoryRow> {
    await this.store.delay()
    const found = this.store.findVariant(input.variantId)
    if (!found) throw AppError.notFound('Variant')
    const { product, variant } = found

    const delta = Math.trunc(input.delta)
    if (delta === 0) throw new AppError('validation', 'Enter a non-zero quantity.')
    const nextStock = variant.stock + delta
    if (nextStock < 0) {
      throw new AppError('validation', 'Stock cannot go below zero.')
    }
    if (nextStock < variant.reservedStock) {
      throw new AppError(
        'validation',
        `Stock cannot drop below the ${variant.reservedStock} units reserved by open orders.`,
      )
    }

    const previousStatus = deriveStockStatus(
      variant.stock - variant.reservedStock,
      variant.lowStockThreshold,
    )
    variant.stock = nextStock
    product.updatedAt = nowIso()

    this.store.movements.unshift({
      id: this.store.nextId('mov'),
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      delta,
      stockAfter: variant.stock,
      reason: input.reason,
      note: input.note.trim(),
      actor: 'Store Admin',
      referenceOrderNumber: null,
      createdAt: nowIso(),
    })

    const row = toInventoryRow(product, variant)
    if (previousStatus === 'in_stock' && row.status !== 'in_stock') {
      this.store.pushNotification({
        type: 'low_stock',
        title: `${row.status === 'out_of_stock' ? 'Out of stock' : 'Low stock'}: ${product.name}`,
        message:
          row.status === 'out_of_stock'
            ? `${variant.sku} is sold out.`
            : `${variant.sku} has ${row.availableStock} units available, below the threshold of ${variant.lowStockThreshold}.`,
        href: '/admin/inventory',
      })
    }
    return row
  }

  async getMovements(variantId: string): Promise<InventoryMovement[]> {
    await this.store.delay()
    return clone(this.store.movements.filter((m) => m.variantId === variantId).sort(byNewest))
  }

  async getRecentMovements(limit: number): Promise<InventoryMovement[]> {
    await this.store.delay()
    return clone([...this.store.movements].sort(byNewest).slice(0, limit))
  }
}
