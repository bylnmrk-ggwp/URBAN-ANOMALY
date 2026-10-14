import type { Product, ProductVariant } from '@/features/products/domain/entities'

/** Persisted cart line. Only identifiers and quantity are stored; pricing comes from the catalog. */
export interface CartItem {
  productId: string
  variantId: string
  quantity: number
  /** Added timestamp, used for stable ordering. */
  addedAt: string
}

export type CartLineIssue =
  'product_unavailable' | 'variant_unavailable' | 'out_of_stock' | 'quantity_reduced'

/** Cart line joined with trusted catalog data. */
export interface ResolvedCartLine {
  item: CartItem
  product: Product | null
  variant: ProductVariant | null
  unitPrice: number
  lineTotal: number
  availableStock: number
  issue: CartLineIssue | null
}

export interface CartTotals {
  subtotal: number
  itemCount: number
  shippingFee: number
  total: number
  /** The threshold `shippingFee` was priced against, so summaries can say how much more qualifies. */
  freeShippingThreshold: number
}

export const CART_STORAGE_VERSION = 1
export const MAX_QUANTITY_PER_LINE = 10
