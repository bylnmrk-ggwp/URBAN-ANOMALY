import type { ProductSize } from '@/features/products/domain/entities'
import type { ISODateString } from '@/types/common'

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export interface InventoryRow {
  variantId: string
  productId: string
  productName: string
  productSlug: string
  imageUrl: string | null
  sku: string
  size: ProductSize
  colorName: string
  physicalStock: number
  reservedStock: number
  availableStock: number
  lowStockThreshold: number
  status: StockStatus
}

export type MovementReason =
  | 'restock'
  | 'correction'
  | 'damaged'
  | 'returned'
  | 'order_reserved'
  | 'order_released'
  | 'order_fulfilled'

export interface InventoryMovement {
  id: string
  variantId: string
  sku: string
  productName: string
  delta: number
  stockAfter: number
  reason: MovementReason
  note: string
  actor: string
  referenceOrderNumber: string | null
  createdAt: ISODateString
}

export interface StockAdjustmentInput {
  variantId: string
  /** Signed quantity. Positive adds stock, negative removes. */
  delta: number
  reason: Extract<MovementReason, 'restock' | 'correction' | 'damaged' | 'returned'>
  note: string
}

export interface InventoryFilters {
  search?: string
  status?: StockStatus | 'all'
  page?: number
  pageSize?: number
}

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  restock: 'Restock',
  correction: 'Count correction',
  damaged: 'Damaged / write-off',
  returned: 'Customer return',
  order_reserved: 'Reserved for order',
  order_released: 'Released from order',
  order_fulfilled: 'Fulfilled order',
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
}

export function deriveStockStatus(available: number, threshold: number): StockStatus {
  if (available <= 0) return 'out_of_stock'
  if (available <= threshold) return 'low_stock'
  return 'in_stock'
}
