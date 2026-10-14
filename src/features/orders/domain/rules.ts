import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from './entities'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refund_pending: 'Refund Pending',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery',
  online: 'Online Payment',
  gcash: 'GCash',
}

/**
 * Methods the buyer pays before fulfilment. Their orders cannot be confirmed until
 * `paymentStatus` is `paid`: online via the provider webhook, GCash once an admin has
 * matched the buyer's reference number against the store's GCash account.
 */
export function isPrepaidMethod(paymentMethod: PaymentMethod): boolean {
  return paymentMethod === 'online' || paymentMethod === 'gcash'
}

/** GCash reference numbers as printed on the receipt: 8–20 letters or digits. */
export const GCASH_REFERENCE_PATTERN = /^[A-Za-z0-9]{8,20}$/
export const GCASH_REFERENCE_MESSAGE =
  'Enter the 8–20 character reference number from your GCash receipt.'

export function isValidGcashReference(value: string): boolean {
  return GCASH_REFERENCE_PATTERN.test(value)
}

/**
 * Allowed fulfillment transitions. Mirrors the backend contract: the UI only
 * offers these, and the backend must re-validate them.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['pending_confirmation', 'cancelled'],
  pending_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

/** Admin-facing actions. `pending_payment -> pending_confirmation` is reserved for the payment webhook. */
export const ADMIN_ORDER_ACTIONS: { status: OrderStatus; label: string; destructive?: boolean }[] =
  [
    { status: 'confirmed', label: 'Confirm Order' },
    { status: 'processing', label: 'Mark Processing' },
    { status: 'shipped', label: 'Mark Shipped' },
    { status: 'delivered', label: 'Mark Delivered' },
    { status: 'cancelled', label: 'Cancel Order', destructive: true },
  ]

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to)
}

export function getAvailableAdminActions(
  order: Pick<Order, 'status' | 'paymentMethod' | 'paymentStatus'>,
) {
  return ADMIN_ORDER_ACTIONS.filter((action) => {
    if (!canTransition(order.status, action.status)) return false
    // Prepaid orders cannot be confirmed by hand before the payment is in: the provider
    // webhook for online orders, an admin verifying the reference for GCash.
    if (
      action.status === 'confirmed' &&
      isPrepaidMethod(order.paymentMethod) &&
      order.paymentStatus !== 'paid'
    ) {
      return false
    }
    return true
  })
}

/** Buyer may cancel only before the order is being prepared. */
export function canCustomerCancel(order: Pick<Order, 'status'>): boolean {
  return order.status === 'pending_payment' || order.status === 'pending_confirmation'
}

/** Linear progress steps shown in the timeline. Terminal failure states are rendered separately. */
export const ORDER_PROGRESS_STEPS: OrderStatus[] = [
  'pending_confirmation',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]

export function getProgressIndex(status: OrderStatus): number {
  if (status === 'pending_payment') return 0
  if (status === 'cancelled') return -1
  return ORDER_PROGRESS_STEPS.indexOf(status)
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0
}

/** GCash orders skip `pending_payment`: the buyer has already paid, an admin verifies the reference. */
export function initialStatusFor(paymentMethod: PaymentMethod): OrderStatus {
  return paymentMethod === 'online' ? 'pending_payment' : 'pending_confirmation'
}

export function initialPaymentStatusFor(paymentMethod: PaymentMethod): PaymentStatus {
  return paymentMethod === 'cod' ? 'unpaid' : 'pending'
}

/** Status badge tone used by the UI; keeps colour decisions out of components. */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive'

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  pending_payment: 'warning',
  pending_confirmation: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'destructive',
}

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  unpaid: 'neutral',
  pending: 'warning',
  paid: 'success',
  failed: 'destructive',
  refund_pending: 'warning',
  refunded: 'neutral',
  partially_refunded: 'neutral',
}

export function generateOrderNumber(sequence: number, date: Date = new Date()): string {
  const y = date.getFullYear().toString().slice(-2)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `ORD-${y}${m}-${String(sequence).padStart(5, '0')}`
}
