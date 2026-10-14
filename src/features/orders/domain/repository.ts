import type { PaginatedResult } from '@/types/common'

import type {
  AdminOrderFilters,
  Order,
  OrderStatus,
  OrderSummary,
  OrderTracking,
  PlaceOrderInput,
  PlaceOrderResult,
} from './entities'

export interface OrderRepository {
  /**
   * Creates an order. In Supabase mode this calls a server-side function that
   * validates stock and prices, reserves inventory and (for online payment)
   * creates the payment session. The browser never computes final totals.
   */
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>
  getOrderByNumber(orderNumber: string): Promise<Order | null>
  /**
   * Guest tracking: the order whose number AND customer email (case-insensitive) both match,
   * otherwise `null`. Works without a session.
   */
  trackOrder(orderNumber: string, email: string): Promise<Order | null>
  /** Orders belonging to the authenticated buyer. Enforced by RLS in Supabase mode. */
  getMyOrders(): Promise<OrderSummary[]>
  getMyOrderById(id: string): Promise<Order | null>
  cancelMyOrder(id: string): Promise<Order>

  // Admin
  getAdminOrders(filters: AdminOrderFilters): Promise<PaginatedResult<OrderSummary>>
  getAdminOrderById(id: string): Promise<Order | null>
  updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order>
  setTracking(id: string, tracking: OrderTracking): Promise<Order>
  /** COD only: records cash collected on delivery. Online payments are updated by webhooks. */
  markCodPaymentCollected(id: string): Promise<Order>
  /**
   * GCash only: the admin has matched the buyer's reference number in the store's GCash
   * account, so the pending payment becomes `paid` and the order can be confirmed.
   */
  markGcashPaymentVerified(id: string): Promise<Order>
  updateAdminNotes(id: string, notes: string): Promise<Order>
}
