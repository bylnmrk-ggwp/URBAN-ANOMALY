import type {
  AdminOrderFilters,
  Order,
  OrderStatus,
  OrderSummary,
  OrderTracking,
  PlaceOrderInput,
  PlaceOrderResult,
} from '@/features/orders/domain/entities'
import type { OrderRepository } from '@/features/orders/domain/repository'
import type { StoreSettings } from '@/features/settings/domain/entities'
import { AppError } from '@/lib/errors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import {
  orderJsonSchema,
  parseRpcJson,
  placeOrderResultSchema,
  toOrderFromJoin,
  toOrderSummary,
  toSettings,
  unwrap,
} from '@/lib/supabase/mappers'
import type { OrderJoinRow } from '@/lib/supabase/mappers'
import type { PaginatedResult } from '@/types/common'

import { OrderEmailGateway } from './orderEmails'

const ORDER_SELECT = '*, order_items(*), order_status_events(*)'
const DEFAULT_PAGE_SIZE = 20

/**
 * Guest checkout: RLS only lets authenticated buyers read their own orders, so the order
 * returned by `place_order` is kept in sessionStorage for the browser that placed it. This
 * makes the confirmation page work for guests without exposing orders by (guessable) number.
 */
const GUEST_ORDER_PREFIX = 'guest-order:'

function rememberGuestOrder(order: OrderJoinRow): void {
  try {
    sessionStorage.setItem(`${GUEST_ORDER_PREFIX}${order.order_number}`, JSON.stringify(order))
  } catch {
    // Storage may be unavailable (private mode, quota); the confirmation page degrades gracefully.
  }
}

function recallGuestOrder(orderNumber: string): Order | null {
  try {
    const raw = sessionStorage.getItem(`${GUEST_ORDER_PREFIX}${orderNumber}`)
    if (!raw) return null
    const parsed = orderJsonSchema.safeParse(JSON.parse(raw))
    return parsed.success ? toOrderFromJoin(parsed.data) : null
  } catch {
    return null
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[,()]/g, ' ').trim()
}

export class SupabaseOrderRepository implements OrderRepository {
  private readonly emails: OrderEmailGateway
  /** Store settings drive the notification toggles; read at most once per page load. */
  private settingsPromise: Promise<StoreSettings> | null = null

  constructor(emails: OrderEmailGateway = new OrderEmailGateway()) {
    this.emails = emails
  }

  private get db() {
    return getSupabaseClient()
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const payload: Json = {
      customer: {
        full_name: input.customer.fullName,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      shipping_address: {
        address_line: input.shippingAddress.addressLine,
        barangay: input.shippingAddress.barangay,
        city: input.shippingAddress.city,
        province: input.shippingAddress.province,
        postal_code: input.shippingAddress.postalCode,
        delivery_instructions: input.shippingAddress.deliveryInstructions,
      },
      payment_method: input.paymentMethod,
      // Validated by `place_order` (format + GCash enabled); stored only for GCash orders.
      payment_reference: input.paymentReference ?? null,
      items: input.items.map((i) => ({
        product_id: i.productId,
        variant_id: i.variantId,
        quantity: i.quantity,
      })),
      customer_note: input.customerNote,
      // Re-validated by `place_order`; the browser never computes the discount amount.
      discount_code: input.discountCode ?? null,
    }
    const data = unwrap(await this.db.rpc('place_order', { payload }))
    const result = parseRpcJson(placeOrderResultSchema, data, 'place_order')
    if (result.order.user_id === null) rememberGuestOrder(result.order)
    const order = toOrderFromJoin(result.order)
    // `place_order` already inserted the in-app admin notification; the email is
    // best effort and never fails the checkout.
    const settings = await this.loadSettings()
    if (settings) await this.emails.sendNewOrderAlert(order, settings)
    return { order, paymentRedirectUrl: result.payment_redirect_url }
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const result = await this.db
      .from('orders')
      .select(ORDER_SELECT)
      .eq('order_number', orderNumber)
      .maybeSingle()
      .overrideTypes<OrderJoinRow | null, { merge: false }>()
    const row = unwrap(result)
    if (row) return toOrderFromJoin(row)
    return recallGuestOrder(orderNumber)
  }

  /**
   * A direct `.eq('order_number', …).ilike('customer_email', …)` select would be blocked by RLS
   * for anonymous visitors (orders are only readable by their owner or admins), so guest
   * tracking goes through the SECURITY DEFINER RPC `track_order` from
   * `supabase/migrations/0003_track_order.sql`, which applies the same two-field match and
   * returns `order_json(...)` or null.
   */
  async trackOrder(orderNumber: string, email: string): Promise<Order | null> {
    const data = unwrap(
      await this.db.rpc('track_order', {
        p_order_number: orderNumber.trim(),
        p_email: email.trim(),
      }),
    )
    if (data === null) return null
    return toOrderFromJoin(parseRpcJson(orderJsonSchema, data, 'track_order'))
  }

  async getMyOrders(): Promise<OrderSummary[]> {
    const { data: auth } = await this.db.auth.getUser()
    if (!auth.user) return []
    const result = await this.db
      .from('order_summaries')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
    return unwrap(result).map(toOrderSummary)
  }

  async getMyOrderById(id: string): Promise<Order | null> {
    return this.fetchOrder(id)
  }

  async cancelMyOrder(id: string): Promise<Order> {
    unwrap(await this.db.rpc('cancel_my_order', { p_order_id: id }))
    return this.requireOrder(id)
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async getAdminOrders(filters: AdminOrderFilters): Promise<PaginatedResult<OrderSummary>> {
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
    const from = (page - 1) * pageSize

    let query = this.db.from('order_summaries').select('*', { count: 'exact' })
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      query = query.eq('payment_status', filters.paymentStatus)
    }
    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters.dateTo) query = query.lte('created_at', filters.dateTo)
    if (filters.search) {
      const term = sanitizeSearch(filters.search)
      if (term) {
        query = query.or(
          `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`,
        )
      }
    }
    query = query.order('created_at', { ascending: false }).range(from, from + pageSize - 1)

    const result = await query
    const rows = unwrap(result)
    const total = result.count ?? rows.length
    return {
      items: rows.map(toOrderSummary),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  }

  async getAdminOrderById(id: string): Promise<Order | null> {
    return this.fetchOrder(id)
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    unwrap(
      await this.db.rpc('update_order_status', {
        p_order_id: id,
        p_status: status,
        p_note: note ?? '',
      }),
    )
    const order = await this.requireOrder(id)
    await this.emailOrderUpdate(order)
    return order
  }

  async setTracking(id: string, tracking: OrderTracking): Promise<Order> {
    unwrap(
      await this.db
        .from('orders')
        .update({ courier: tracking.courier, tracking_number: tracking.trackingNumber })
        .eq('id', id),
    )
    return this.requireOrder(id)
  }

  async markCodPaymentCollected(id: string): Promise<Order> {
    unwrap(await this.db.rpc('mark_cod_payment_collected', { p_order_id: id }))
    return this.requireOrder(id)
  }

  /** `0005_gcash.sql`: admin-only RPC; also raises the `payment_confirmed` notification. */
  async markGcashPaymentVerified(id: string): Promise<Order> {
    unwrap(await this.db.rpc('mark_gcash_payment_verified', { p_order_id: id }))
    return this.requireOrder(id)
  }

  async updateAdminNotes(id: string, notes: string): Promise<Order> {
    unwrap(await this.db.from('orders').update({ admin_notes: notes }).eq('id', id))
    return this.requireOrder(id)
  }

  // ---------------------------------------------------------------------------

  /**
   * `store_settings` is world-readable (see `0001_schema.sql`), so this works for
   * guest checkouts too. Returns null rather than throwing: the caller's order
   * has already been written and must not fail over a notification lookup.
   */
  private async loadSettings(): Promise<StoreSettings | null> {
    this.settingsPromise ??= (async () =>
      toSettings(unwrap(await this.db.from('store_settings').select('*').eq('id', 1).single())))()
    try {
      return await this.settingsPromise
    } catch {
      this.settingsPromise = null
      return null
    }
  }

  /**
   * Flow 2: emails the customer, then records the outcome as an in-app
   * notification. The insert goes through `record_order_update_notification`
   * because `notifications` has no client insert policy.
   */
  private async emailOrderUpdate(order: Order): Promise<void> {
    const settings = await this.loadSettings()
    if (!settings) return
    const result = await this.emails.sendOrderUpdate(order, settings, {
      paymentConfirmed: order.status === 'pending_confirmation' && order.paymentStatus === 'paid',
    })
    // Nothing to report when email is simply not configured.
    if (result.status === 'skipped') return
    try {
      unwrap(
        await this.db.rpc('record_order_update_notification', {
          p_order_id: order.id,
          p_emailed: result.status === 'sent',
        }),
      )
    } catch {
      // The status change itself succeeded; the audit notification is best effort.
    }
  }

  private async fetchOrder(id: string): Promise<Order | null> {
    const result = await this.db
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<OrderJoinRow | null, { merge: false }>()
    const row = unwrap(result)
    return row ? toOrderFromJoin(row) : null
  }

  private async requireOrder(id: string): Promise<Order> {
    const order = await this.fetchOrder(id)
    if (!order) throw AppError.notFound('Order')
    return order
  }
}
