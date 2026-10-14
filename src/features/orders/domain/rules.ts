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
    // Online orders cannot be confirmed by hand before the payment provider reports success.
    if (
      action.status === 'confirmed' &&
      order.paymentMethod === 'online' &&
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

export function initialStatusFor(paymentMethod: PaymentMethod): OrderStatus {
  return paymentMethod === 'cod' ? 'pending_confirmation' : 'pending_payment'
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
