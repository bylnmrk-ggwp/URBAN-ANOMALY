import type { StockAlert } from '@/features/stock-alerts/domain/entities'
import { availableStock } from '@/features/products/domain/rules'

import { SEED_PRODUCTS, daysAgo } from './products'

const WAITING_EMAILS = [
  'juan.delacruz@gmail.com',
  'andrea.reyes@yahoo.com',
  'paolo.v@gmail.com',
  'christine.tan@outlook.com',
  'buyer@demo.local',
]

/**
 * Four alerts spread over the first sold-out variants in the catalog (derived, so the seed
 * never points at a variant that is actually in stock). Two customers wait on the same
 * variant so the admin page has a group with more than one email.
 */
function buildSeed(): StockAlert[] {
  const soldOut: { productIndex: number; variantIndex: number }[] = []
  SEED_PRODUCTS.forEach((product, productIndex) => {
    if (product.status !== 'published') return
    product.variants.forEach((variant, variantIndex) => {
      if (availableStock(variant) === 0) soldOut.push({ productIndex, variantIndex })
    })
  })

  // Variant slots: first sold-out variant twice, then the next two distinct ones.
  const slots = [soldOut[0], soldOut[0], soldOut[1], soldOut[2]]
  const alerts: StockAlert[] = []
  slots.forEach((slot, index) => {
    if (!slot) return
    const product = SEED_PRODUCTS[slot.productIndex]
    const variant = product?.variants[slot.variantIndex]
    if (!product || !variant) return
    alerts.push({
      id: `alert-0${index + 1}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantId: variant.id,
      sku: variant.sku,
      size: variant.size,
      colorName: variant.color.name,
      email: WAITING_EMAILS[index] ?? `customer${index}@example.com`,
      status: 'waiting',
      createdAt: daysAgo(6 - index, index * 3),
      notifiedAt: null,
    })
  })
  return alerts
}

export const SEED_STOCK_ALERTS: StockAlert[] = buildSeed()
