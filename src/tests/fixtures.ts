/**
 * Small factories built on the real mock seed so tests exercise realistic data.
 * Every factory deep-clones the seed before applying overrides.
 */
import type { CartItem, ResolvedCartLine } from '@/features/cart/domain/entities'
import type { Order, OrderSummary } from '@/features/orders/domain/entities'
import type { Product, ProductVariant } from '@/features/products/domain/entities'
import { availableStock, getDisplayPrice } from '@/features/products/domain/rules'
import type { EmailClient, EmailMessage, EmailSendResult, EmailSkipReason } from '@/lib/email/types'
import { emailSkipped } from '@/lib/email/types'
import { SEED_ORDERS } from '@/mocks/data/orders'
import { SEED_PRODUCTS, variantId } from '@/mocks/data/products'
import { clone, toOrderSummary } from '@/mocks/helpers'

export { variantId }

/** Published seed product with mixed stock: "Lava Premium Clog" (prod-01). */
export const SEED_CLOG_ID = 'prod-01'
export const SEED_CLOG_SLUG = 'lava-premium-clog'
/** prod-01 / 8 / Lava has 48 pairs on hand and none reserved. */
export const SEED_CLOG_IN_STOCK_VARIANT_ID = variantId(SEED_CLOG_ID, '8', 'Lava')
/** prod-01 / 6 / Lava has zero stock. */
export const SEED_CLOG_SOLD_OUT_VARIANT_ID = variantId(SEED_CLOG_ID, '6', 'Lava')

/** Seed COD order awaiting confirmation (ord-17). */
export const SEED_PENDING_COD_ORDER_ID = 'ord-17'
/** Seed GCash order whose reference still has to be verified (ord-19). */
export const SEED_PENDING_GCASH_ORDER_ID = 'ord-19'
/** Seed cancelled COD order (ord-03). */
export const SEED_CANCELLED_ORDER_ID = 'ord-03'

function requireSeedProduct(id: string): Product {
  const product = SEED_PRODUCTS.find((p) => p.id === id)
  if (!product) throw new Error(`Seed product ${id} not found`)
  return clone(product)
}

function requireSeedOrder(id: string): Order {
  const order = SEED_ORDERS.find((o) => o.id === id)
  if (!order) throw new Error(`Seed order ${id} not found`)
  return clone(order)
}

export function makeProduct(overrides: Partial<Product> = {}, seedId = SEED_CLOG_ID): Product {
  return { ...requireSeedProduct(seedId), ...overrides }
}

export function makeVariant(
  overrides: Partial<ProductVariant> = {},
  seedId = SEED_CLOG_ID,
  seedVariantId = SEED_CLOG_IN_STOCK_VARIANT_ID,
): ProductVariant {
  const product = requireSeedProduct(seedId)
  const variant = product.variants.find((v) => v.id === seedVariantId)
  if (!variant) throw new Error(`Seed variant ${seedVariantId} not found`)
  return { ...variant, ...overrides }
}

export function makeOrder(
  overrides: Partial<Order> = {},
  seedId = SEED_PENDING_COD_ORDER_ID,
): Order {
  return { ...requireSeedOrder(seedId), ...overrides }
}

export function makeOrderSummary(
  overrides: Partial<OrderSummary> = {},
  seedId = SEED_PENDING_COD_ORDER_ID,
): OrderSummary {
  return { ...toOrderSummary(requireSeedOrder(seedId)), ...overrides }
}

export function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: SEED_CLOG_ID,
    variantId: SEED_CLOG_IN_STOCK_VARIANT_ID,
    quantity: 1,
    addedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** A fully resolved, issue-free cart line for the given product/variant. */
export function makeResolvedLine(
  overrides: Partial<ResolvedCartLine> = {},
  product: Product = makeProduct(),
  variant: ProductVariant = makeVariant(),
): ResolvedCartLine {
  const quantity = overrides.item?.quantity ?? 1
  const unitPrice = getDisplayPrice(product)
  return {
    item: makeCartItem({ productId: product.id, variantId: variant.id, quantity }),
    product,
    variant,
    unitPrice,
    lineTotal: unitPrice * quantity,
    availableStock: availableStock(variant),
    issue: null,
    ...overrides,
  }
}

export interface FakeEmailClient extends EmailClient {
  /** Every message handed to {@link EmailClient.send}, in order. */
  readonly sent: EmailMessage[]
}

/**
 * In-memory {@link EmailClient}. Records what the app tried to send and never
 * touches the network, so order-email behaviour can be asserted directly.
 *
 * `outcome` decides what every send reports: `'sent'` (default), `'failed'`, or
 * a skip reason such as `'not_configured'` for the unconfigured path.
 */
export function makeFakeEmailClient(
  outcome: 'sent' | 'failed' | EmailSkipReason = 'sent',
): FakeEmailClient {
  const sent: EmailMessage[] = []
  return {
    sent,
    isConfigured: outcome !== 'not_configured',
    send(message: EmailMessage): Promise<EmailSendResult> {
      sent.push(message)
      if (outcome === 'sent') return Promise.resolve({ status: 'sent', template: message.template })
      if (outcome === 'failed') {
        return Promise.resolve({
          status: 'failed',
          template: message.template,
          error: 'Fake transport failure.',
        })
      }
      return Promise.resolve(emailSkipped(message.template, outcome))
    },
  }
}
