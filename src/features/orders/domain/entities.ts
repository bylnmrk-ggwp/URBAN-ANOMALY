import type { ProductSize } from '@/features/products/domain/entities'
import type { ISODateString } from '@/types/common'

export type OrderStatus =
  | 'pending_payment'
  | 'pending_confirmation'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus =
  'unpaid' | 'pending' | 'paid' | 'failed' | 'refund_pending' | 'refunded' | 'partially_refunded'

/** `gcash`: the buyer scans the store's QR, pays, and types the GCash reference number. */
export type PaymentMethod = 'cod' | 'online' | 'gcash'

export interface OrderCustomer {
  userId: string | null
  fullName: string
  email: string
  phone: string
}

export interface ShippingAddress {
  addressLine: string
  barangay: string
  city: string
  province: string
  postalCode: string
  deliveryInstructions: string
}

export interface OrderItem {
  id: string
  productId: string
  variantId: string
  productName: string
  productSlug: string
  imageUrl: string | null
  sku: string
  size: ProductSize
  colorName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderStatusEvent {
  id: string
  status: OrderStatus
  note: string | null
  actor: 'customer' | 'admin' | 'system'
  createdAt: ISODateString
}

export interface OrderTracking {
  courier: string
  trackingNumber: string
}

export interface Order {
  id: string
  orderNumber: string
  customer: OrderCustomer
  shippingAddress: ShippingAddress
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  /** GCash reference number typed by the buyer at checkout; null for every other method. */
  paymentReference: string | null
  status: OrderStatus
  statusHistory: OrderStatusEvent[]
  tracking: OrderTracking | null
  customerNote: string
  adminNotes: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface OrderSummary {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  itemCount: number
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  paymentReference: string | null
  status: OrderStatus
  createdAt: ISODateString
}

export interface PlaceOrderInput {
  customer: Omit<OrderCustomer, 'userId'>
  shippingAddress: ShippingAddress
  paymentMethod: PaymentMethod
  items: { productId: string; variantId: string; quantity: number }[]
  customerNote: string
  /** Discount code applied at checkout; validated again server-side when the order is placed. */
  discountCode?: string
  /** GCash reference number from the buyer's receipt; required for `gcash`, ignored otherwise. */
  paymentReference?: string
}

/** Result of placing an order. Online payments return a handoff URL for the payment provider. */
export interface PlaceOrderResult {
  order: Order
  paymentRedirectUrl: string | null
}

export interface AdminOrderFilters {
  search?: string
  status?: OrderStatus | 'all'
  paymentStatus?: PaymentStatus | 'all'
  dateFrom?: ISODateString
  dateTo?: ISODateString
  page?: number
  pageSize?: number
}
