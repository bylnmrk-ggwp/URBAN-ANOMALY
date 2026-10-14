import type { Product } from '@/features/products/domain/entities'
import { availableStock, getDisplayPrice } from '@/features/products/domain/rules'
import type { StoreSettings } from '@/features/settings/domain/entities'

import type { CartItem, CartTotals, ResolvedCartLine } from './entities'
import { MAX_QUANTITY_PER_LINE } from './entities'

export const FREE_SHIPPING_THRESHOLD = 2500
export const FLAT_SHIPPING_FEE = 150

/**
 * The store's shipping rule (`store_settings.flat_shipping_fee` / `free_shipping_threshold`),
 * which `place_order` prices from. The constants above are only the fallback while it loads.
 */
export type ShippingSettings = Pick<StoreSettings, 'flatShippingFee' | 'freeShippingThreshold'>

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  flatShippingFee: FLAT_SHIPPING_FEE,
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
}

export function cartItemKey(item: Pick<CartItem, 'variantId'>): string {
  return item.variantId
}

export function countItems(items: Pick<CartItem, 'quantity'>[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

export function calculateShippingFee(
  subtotal: number,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): number {
  if (subtotal <= 0) return 0
  return subtotal >= settings.freeShippingThreshold ? 0 : settings.flatShippingFee
}

export function calculateTotals(
  lines: ResolvedCartLine[],
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): CartTotals {
  const valid = lines.filter(
    (l) =>
      l.issue !== 'product_unavailable' &&
      l.issue !== 'variant_unavailable' &&
      l.issue !== 'out_of_stock',
  )
  const subtotal = round2(valid.reduce((sum, l) => sum + l.lineTotal, 0))
  const shippingFee = calculateShippingFee(subtotal, settings)
  return {
    subtotal,
    itemCount: countItems(valid.map((l) => l.item)),
    shippingFee,
    total: round2(subtotal + shippingFee),
    freeShippingThreshold: settings.freeShippingThreshold,
  }
}

/** Join stored cart lines with trusted catalog products. Flags lines whose product, variant or stock changed. */
export function resolveCartLines(items: CartItem[], products: Product[]): ResolvedCartLine[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  return items.map((item) => {
    const product = byId.get(item.productId) ?? null
    if (!product || product.status !== 'published') {
      return emptyLine(item, 'product_unavailable')
    }
    const variant = product.variants.find((v) => v.id === item.variantId) ?? null
    if (!variant) {
      return { ...emptyLine(item, 'variant_unavailable'), product }
    }
    const stock = availableStock(variant)
    const unitPrice = getDisplayPrice(product)
    if (stock === 0) {
      return {
        item,
        product,
        variant,
        unitPrice,
        lineTotal: 0,
        availableStock: 0,
        issue: 'out_of_stock',
      }
    }
    const quantity = Math.min(item.quantity, stock)
    return {
      item: { ...item, quantity },
      product,
      variant,
      unitPrice,
      lineTotal: round2(unitPrice * quantity),
      availableStock: stock,
      issue: quantity < item.quantity ? 'quantity_reduced' : null,
    }
  })
}

export function hasBlockingIssues(lines: ResolvedCartLine[]): boolean {
  return lines.some((l) => l.issue !== null && l.issue !== 'quantity_reduced')
}

export function clampCartQuantity(quantity: number, available: number): number {
  const cap = Math.min(MAX_QUANTITY_PER_LINE, Math.max(0, available))
  return Math.min(Math.max(0, Math.floor(quantity)), cap)
}

function emptyLine(item: CartItem, issue: ResolvedCartLine['issue']): ResolvedCartLine {
  return {
    item,
    product: null,
    variant: null,
    unitPrice: 0,
    lineTotal: 0,
    availableStock: 0,
    issue,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
