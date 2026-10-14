import type { InventoryRow } from '@/features/inventory/domain/entities'
import { deriveStockStatus } from '@/features/inventory/domain/entities'
import type { Order, OrderSummary } from '@/features/orders/domain/entities'
import type { Product, ProductVariant } from '@/features/products/domain/entities'
import { PRODUCT_SIZES } from '@/features/products/domain/entities'
import { availableStock, getPrimaryImage } from '@/features/products/domain/rules'

/** Deep-clones plain JSON-like seed data so mutations never touch module constants. */
export function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Case-insensitive "any of these fields contains the term" check. */
export function matchesSearch(term: string | undefined, ...fields: (string | null | undefined)[]) {
  const needle = term?.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => field?.toLowerCase().includes(needle))
}

export function byNewest<T extends { createdAt: string }>(a: T, b: T): number {
  return b.createdAt.localeCompare(a.createdAt)
}

export function toOrderSummary(order: Order): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.fullName,
    customerEmail: order.customer.email,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentReference: order.paymentReference,
    status: order.status,
    createdAt: order.createdAt,
  }
}

export function toInventoryRow(product: Product, variant: ProductVariant): InventoryRow {
  const available = availableStock(variant)
  return {
    variantId: variant.id,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    imageUrl: getPrimaryImage(product)?.url ?? null,
    sku: variant.sku,
    size: variant.size,
    colorName: variant.color.name,
    physicalStock: variant.stock,
    reservedStock: variant.reservedStock,
    availableStock: available,
    lowStockThreshold: variant.lowStockThreshold,
    status: deriveStockStatus(available, variant.lowStockThreshold),
  }
}

/** Live inventory rows for every non-archived product, ordered by product, colour and size. */
export function deriveInventoryRows(products: Product[]): InventoryRow[] {
  const rows: InventoryRow[] = []
  for (const product of products) {
    if (product.status === 'archived') continue
    for (const variant of product.variants) rows.push(toInventoryRow(product, variant))
  }
  return rows.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.colorName.localeCompare(b.colorName) ||
      PRODUCT_SIZES.indexOf(a.size) - PRODUCT_SIZES.indexOf(b.size),
  )
}

/** Start of the local day for `date`, as an ISO string. */
export function startOfDayIso(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Local calendar day key (YYYY-MM-DD) for grouping. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
